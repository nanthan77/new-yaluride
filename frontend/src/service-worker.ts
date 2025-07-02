// src/service-worker.ts
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any[];
};

// --- Cache Names ---
const STATIC_RESOURCES_CACHE = 'gamango-static-resources-v1';
const IMAGE_CACHE = 'gamango-images-v1';
const API_CACHE = 'gamango-api-v1';
const MAP_TILES_CACHE = 'gamango-map-tiles-v1';
// Voice recordings are typically large and better stored in IndexedDB by the app,
// with background sync handling their upload/processing.
// If direct SW caching of fetched voice recordings is needed, add a cache name here.

// --- Precache App Shell and Static Assets ---
// self.__WB_MANIFEST is injected by the build process (e.g., vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches(); // Cleans up old precaches

// --- Service Worker Lifecycle ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', () => {
  self.skipWaiting(); // Activate new service worker as soon as it's installed
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Take control of all clients as soon as the SW activates
      await self.clients.claim();

      // Clean up old runtime caches
      const cacheNames = await caches.keys();
      const CachesToKeep = [
        STATIC_RESOURCES_CACHE,
        IMAGE_CACHE,
        API_CACHE,
        MAP_TILES_CACHE,
        // Add any other current cache names here
      ];
      // Also keep Workbox's own precache and runtime caches
      const workboxCaches = cacheNames.filter(name => /workbox-(precache|runtime)/.test(name));
      
      const cachesToDelete = cacheNames.filter(
        (name) => !CachesToKeep.includes(name) && !workboxCaches.includes(name) && name.startsWith('gamango-')
      );
      
      await Promise.all(cachesToDelete.map((cacheName) => caches.delete(cacheName)));
      console.log('Old runtime caches cleaned up.');
    })()
  );
});


// --- Caching Strategies for Different Resource Types ---

// Static Assets (CSS, JS, Fonts)
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker' || // For JS workers
    request.destination === 'font',
  new CacheFirst({
    cacheName: STATIC_RESOURCES_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100, // Cache more static assets
        maxAgeSeconds: 60 * 24 * 60 * 60, // 60 Days
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: IMAGE_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100, // Cache more images
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200], // Cache opaque responses (e.g. from CDN) and successful ones
      }),
    ],
  })
);

// API Calls (e.g., /api/*)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 5, // Timeout for network request before falling back to cache
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200, // Cache more API responses
        maxAgeSeconds: 2 * 24 * 60 * 60, // 2 Days for API data
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Map Tiles (e.g., from OpenStreetMap, Mapbox, or self-hosted)
// Adjust the regex to match your map tile URLs
registerRoute(
  ({ url }) => /\/(tile\.openstreetmap\.org|api\.mapbox\.com\/styles\/v1\/.*\/tiles|tiles\.gamango\.lk)\//.test(url.href),
  new CacheFirst({ // Map tiles don't change often, so CacheFirst is good
    cacheName: MAP_TILES_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 1000, // Allow caching many map tiles
        maxAgeSeconds: 90 * 24 * 60 * 60, // 90 Days for map tiles
        purgeOnQuotaError: true, // Automatically cleanup if quota is exceeded
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// --- Offline Fallback Page ---
// This strategy serves the `/offline.html` page (which should be precached)
// when a navigation request fails.
const offlineFallbackPage = '/offline.html'; // Ensure this is in your precache list or public folder

const navigationRoute = new NavigationRoute(
  async ({ event }) => {
    try {
      // Try to fetch the page from the network
      const networkResponse = await fetch((event as FetchEvent).request);
      return networkResponse;
    } catch (error) {
      // If network fails, try to get it from the cache
      const cache = await caches.open(STATIC_RESOURCES_CACHE); // Or your precache name
      const cachedResponse = await cache.match((event as FetchEvent).request);
      if (cachedResponse) {
        return cachedResponse;
      }
      // If not in cache, serve the offline fallback page
      const fallbackResponse = await caches.match(offlineFallbackPage);
      if (fallbackResponse) {
        return fallbackResponse;
      }
      // If offline.html is also not available (shouldn't happen if precached)
      return new Response("You are offline and the requested page isn't cached.", {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }
);
registerRoute(navigationRoute);


// --- Background Sync ---
// For queuing failed POST/PUT/DELETE requests (e.g., ride bookings, profile updates)
const bgSyncPluginRides = new BackgroundSyncPlugin('gamango-sync-rides-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
  async onSync({ queue }) {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        console.log('Background sync: Ride request synced successfully', entry.request.url);
      } catch (err) {
        console.error('Background sync: Ride request failed to sync, will retry later', err);
        await queue.unshiftRequest(entry); // Re-queue the request
        throw err; // Throw error to trigger retry by Workbox
      }
    }
  }
});

const bgSyncPluginVoice = new BackgroundSyncPlugin('gamango-sync-voice-queue', {
  maxRetentionTime: 24 * 60,
  async onSync({ queue }) {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        // This assumes the request body contains necessary data (e.g., ID of voice recording in IndexedDB)
        // or the voice data itself if it's small enough.
        // For large voice blobs, the app should store them in IndexedDB and the request payload
        // here should be a pointer/ID to that blob. The sync handler would then fetch from IDB and upload.
        await fetch(entry.request.clone());
        console.log('Background sync: Voice command/recording synced successfully', entry.request.url);
      } catch (err) {
        console.error('Background sync: Voice command/recording failed to sync, will retry later', err);
        await queue.unshiftRequest(entry);
        throw err;
      }
    }
  }
});

// Register background sync for specific API routes (typically mutations)
registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api/rides') && request.method === 'POST',
  new NetworkOnly({ // Attempt network first, if fails, queue for background sync
    plugins: [bgSyncPluginRides],
  }),
  'POST'
);

registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api/voice/process') && request.method === 'POST',
  new NetworkOnly({
    plugins: [bgSyncPluginVoice],
  }),
  'POST'
);

// Example of how the application might trigger a background sync request for a ride booking
// This is illustrative; actual queuing logic is in the app, this SW part handles the 'sync' event.
// The app would typically try a fetch, and on failure, store data in IndexedDB
// and then register a sync event:
// if ('serviceWorker' in navigator && 'SyncManager' in window) {
//   navigator.serviceWorker.ready.then(registration => {
//     return registration.sync.register('gamango-sync-rides'); // or 'gamango-sync-voice-commands'
//   });
// }

// The BackgroundSyncPlugin handles the 'sync' event registration implicitly for failed network requests
// on routes it's attached to.
// For more complex scenarios (e.g., data from IndexedDB), a manual 'sync' event listener is better.

self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === 'gamango-manual-sync-rides') {
    syncEvent.waitUntil(syncOfflineRidesFromIDB());
  } else if (syncEvent.tag === 'gamango-manual-sync-voice') {
    syncEvent.waitUntil(syncOfflineVoiceRecordingsFromIDB());
  }
});

async function syncOfflineRidesFromIDB() {
  // 1. Open IndexedDB
  // 2. Get all pending ride booking records
  // 3. For each record, try to POST to /api/rides
  // 4. On success, remove from IndexedDB
  // 5. On failure, handle retry logic (or let Workbox's BackgroundSyncPlugin handle it if it was queued that way)
  console.log('Manually syncing offline rides from IndexedDB...');
  // Placeholder for actual implementation
  // const db = await openRideQueueDB();
  // const rides = await db.getAllPendingRides();
  // for (const ride of rides) { try { await fetch(...); await db.deleteRide(ride.id); } catch {} }
}

async function syncOfflineVoiceRecordingsFromIDB() {
  // Similar to syncOfflineRidesFromIDB, but for voice recordings
  // Fetch voice blob from IndexedDB, then POST to /api/voice/process
  console.log('Manually syncing offline voice recordings from IndexedDB...');
  // Placeholder for actual implementation
}

console.log('GamanGo Service Worker V1 Loaded.');

// ---------------------------------------------------------------------------
// Push Notifications
// ---------------------------------------------------------------------------

/**
 * Handle incoming push events
 * The payload is expected to be a JSON string with at least:
 *  { title: string; options?: NotificationOptions }
 * `options.data.url` can be supplied to control where the PWA should navigate
 * when the user clicks the notification.
 */
self.addEventListener('push', (event) => {
  const DEFAULT_TITLE = 'GamanGo';
  let title: string = DEFAULT_TITLE;
  let options: NotificationOptions = {
    body: 'You have a new notification.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: '/' },
  };

  try {
    if (event.data) {
      // Some back-ends send text while others send JSON; try JSON first.
      const payload = event.data.text();
      const parsed = JSON.parse(payload);
      title = parsed.title || title;
      // Merge deep but shallow is fine for our keys
      options = { ...options, ...(parsed.options || {}) };
    }
  } catch (err) {
    // Malformed JSON – fall back to default notification
    console.error('[ServiceWorker] Failed to parse push payload', err);
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Handle clicks on notifications.
 * Attempts to focus an existing GamanGo client; if none exists, opens a new one
 * to the URL specified in notification.data.url (defaults to '/').
 */
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const targetUrl = (notification?.data && notification.data.url) || '/';
  notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Try to find an open window/tab for the PWA
      for (const client of allClients) {
        if ('focus' in client) {
          // If the client is already at the target URL or root, just focus it
          if (client.url.includes(self.origin) || client.url === targetUrl) {
            await client.focus();
            // Optionally postMessage to the client here if needed
            return;
          }
        }
      }
      // No client focused – open a new window
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
