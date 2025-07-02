/**
 * @file pushNotificationService.ts
 * @description Manages PWA push notification subscriptions and permissions.
 *
 * @important
 * This service handles the client-side logic for subscribing a user to push notifications.
 * It communicates with our backend to save/remove subscription details. The actual display
 * of incoming push notifications is handled by the main service worker (`service-worker.ts`).
 */

import { toast } from 'react-hot-toast';
import { apiClient } from '../api/apiClient'; // Assuming a shared, configured API client

// --- Type Definitions ---

/**
 * Custom error class for push notification specific issues.
 */
class PushNotificationError extends Error {
  constructor(message: string, public code?: 'unsupported' | 'denied' | 'api_error' | 'subscription_failed') {
    super(message);
    this.name = 'PushNotificationError';
  }
}

/**
 * Expected payload format for a push notification event received by the service worker.
 * This should match the format sent by the backend (e.g., Notification Service).
 */
interface NotificationPayload {
  title: string;
  options: {
    body?: string;
    icon?: string; // URL to an icon
    badge?: string; // URL to a badge icon
    image?: string; // URL to an image to display in the notification
    data?: any; // Any custom data to pass to the service worker
    tag?: string; // An ID to group or replace notifications
    renotify?: boolean;
    requireInteraction?: boolean;
    silent?: boolean;
    vibrate?: readonly number[];
  };
}


// --- Helper Functions ---

/**
 * Converts a VAPID public key from URL-safe base64 to a Uint8Array.
 * This is required by the PushManager API.
 * @param base64String The VAPID public key.
 * @returns The Uint8Array representation of the key.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


// --- Core Service Logic ---

class PushNotificationService {
  private static instance: PushNotificationService;
  private readonly logger = console; // Replace with a more sophisticated logger if needed
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey: string | null = null;

  private constructor() {
    this.initializeServiceWorker();
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Registers the service worker and sets the registration property.
   * This should be called once when the application loads.
   */
  private async initializeServiceWorker() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      this.logger.warn('Push messaging is not supported in this browser.');
      return;
    }
    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
      this.logger.log('Service Worker is ready for push notifications.');
    } catch (error) {
      this.logger.error('Service Worker not ready for push notifications:', error);
    }
  }

  /**
   * Fetches the VAPID public key from the backend.
   * Caches the key to avoid repeated requests.
   */
  private async getVapidPublicKey(): Promise<string> {
    if (this.vapidPublicKey) {
      return this.vapidPublicKey;
    }
    try {
      const response = await apiClient.get<{ publicKey: string }>('/notifications/vapid-public-key');
      this.vapidPublicKey = response.data.publicKey;
      return this.vapidPublicKey;
    } catch (error) {
      this.logger.error('Failed to fetch VAPID public key from server.', error);
      throw new PushNotificationError('Could not retrieve server key for notifications.', 'api_error');
    }
  }

  /**
   * Requests permission from the user to show notifications.
   * @returns The permission state: 'granted', 'denied', or 'default'.
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    const permission = await Notification.requestPermission();
    if (permission === 'denied') {
      toast.error('Notification permission was denied. Please enable it in browser settings.');
    }
    return permission;
  }

  /**
   * Subscribes the user to push notifications.
   * This is the main function to call from the UI.
   */
  public async subscribeUser(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      throw new PushNotificationError('Service Worker not available.', 'unsupported');
    }

    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') {
      throw new PushNotificationError('Permission not granted for notifications.', 'denied');
    }

    try {
      const vapidPublicKey = await this.getVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      this.logger.log('User subscribed successfully:', subscription.toJSON());
      await this.sendSubscriptionToBackend(subscription);
      toast.success('Notifications enabled!');

    } catch (error) {
      this.logger.error('Failed to subscribe the user:', error);
      throw new PushNotificationError('Failed to enable notifications.', 'subscription_failed');
    }
  }

  /**
   * Unsubscribes the user from push notifications.
   */
  public async unsubscribeUser(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      this.logger.warn('Service Worker not available, cannot unsubscribe.');
      return;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (subscription) {
        await this.removeSubscriptionFromBackend(subscription);
        const unsubscribed = await subscription.unsubscribe();
        if (unsubscribed) {
          this.logger.log('User unsubscribed successfully.');
          toast.success('Notifications disabled.');
        }
      } else {
        this.logger.log('No active subscription found to unsubscribe.');
      }
    } catch (error) {
      this.logger.error('Failed to unsubscribe user:', error);
      toast.error('Could not disable notifications. Please try again.');
    }
  }

  /**
   * Sends the push subscription object to the backend for storage.
   * @param subscription The PushSubscription object.
   */
  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      await apiClient.post('/notifications/subscribe', subscription.toJSON());
      this.logger.log('Subscription details sent to backend.');
    } catch (error) {
      this.logger.error('Failed to send subscription to backend:', error);
      // If this fails, we should probably unsubscribe the user to avoid a broken state.
      await subscription.unsubscribe().catch(err => this.logger.error('Failed to clean up subscription after backend error.', err));
      throw new PushNotificationError('Could not save notification preferences.', 'api_error');
    }
  }

  /**
   * Notifies the backend to remove the user's push subscription.
   * @param subscription The PushSubscription object to be removed.
   */
  private async removeSubscriptionFromBackend(subscription: PushSubscription): Promise<void> {
    try {
      // The endpoint is the unique identifier for a subscription.
      const payload = { endpoint: subscription.endpoint };
      await apiClient.post('/notifications/unsubscribe', payload);
      this.logger.log('Unsubscribe request sent to backend.');
    } catch (error) {
      this.logger.error('Failed to send unsubscribe request to backend:', error);
      // Don't throw here, as the user is already unsubscribed on the client.
      // The backend should have a cleanup mechanism for stale subscriptions.
    }
  }

  /**
   * Checks if the user is currently subscribed to push notifications.
   */
  public async isSubscribed(): Promise<boolean> {
    if (!this.serviceWorkerRegistration) return false;
    const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
    return subscription !== null;
  }
}

/*
 * =======================================================================================
 * SERVICE WORKER PUSH EVENT HANDLING (Documentation)
 * =======================================================================================
 * The following logic should be placed inside your main service worker file (`service-worker.ts`).
 * It listens for incoming push events from the server and displays a notification.
 *
 * self.addEventListener('push', (event) => {
 *   if (!event.data) {
 *     console.error('Push event but no data');
 *     return;
 *   }
 *
 *   try {
 *     const payload: NotificationPayload = event.data.json();
 *     console.log('Received push notification payload:', payload);
 *
 *     const title = payload.title;
 *     const options = {
 *       body: payload.options.body || 'You have a new notification.',
 *       icon: payload.options.icon || '/icons/icon-192.png',
 *       badge: payload.options.badge || '/icons/badge-72.png',
 *       data: payload.options.data || { url: '/' }, // Default to open home page
 *       tag: payload.options.tag || 'yaluride-notification',
 *       ...payload.options, // Pass through other options like renotify, silent, etc.
 *     };
 *
 *     event.waitUntil(self.registration.showNotification(title, options));
 *
 *   } catch (e) {
 *     console.error('Error parsing push data:', e);
 *     // Show a generic notification if parsing fails
 *     const title = "New Notification";
 *     const options = {
 *       body: "You have a new update from YALURIDE.",
 *       icon: '/icons/icon-192.png',
 *     };
 *     event.waitUntil(self.registration.showNotification(title, options));
 *   }
 * });
 *
 * self.addEventListener('notificationclick', (event) => {
 *   event.notification.close();
 *   const urlToOpen = event.notification.data?.url || '/';
 *
 *   event.waitUntil(
 *     clients.matchAll({ type: 'window' }).then((clientList) => {
 *       for (const client of clientList) {
 *         if (client.url === urlToOpen && 'focus' in client) {
 *           return client.focus();
 *         }
 *       }
 *       if (clients.openWindow) {
 *         return clients.openWindow(urlToOpen);
 *       }
 *     })
 *   );
 * });
 * =======================================================================================
 */

// Export a singleton instance for easy use across the app.
export const pushNotificationService = PushNotificationService.getInstance();
