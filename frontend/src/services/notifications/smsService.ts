import { toast } from 'react-hot-toast';
import { apiClient } from '../api/apiClient'; // Assuming a shared, configured API client instance

/**
 * Defines the types of SMS messages the system can send.
 * This helps the backend apply different templates or use different sender IDs.
 */
export enum SmsMessageType {
  OTP = 'OTP',
  RIDE_UPDATE = 'RIDE_UPDATE',
  PROMOTIONAL = 'PROMOTIONAL',
  GENERAL_ALERT = 'GENERAL_ALERT',
}

/**
 * The payload for the backend SMS sending endpoint.
 */
interface SendSmsPayload {
  to: string;
  message: string;
  type?: SmsMessageType;
}

/**
 * The expected successful response from the backend.
 */
interface SendSmsResponse {
  success: boolean;
  messageId?: string; // The ID from the SMS provider (e.g., Twilio SID)
  status: string;
}

/**
 * SmsService provides a secure and centralized way to send SMS messages
 * by communicating with the YALURIDE backend's notification service.
 *
 * It follows a singleton pattern to ensure a single instance is used application-wide.
 *
 * @important This service does NOT interact directly with third-party SMS providers.
 *            It sends requests to our own backend, which securely handles the interaction
 *            with services like Twilio. This prevents exposing sensitive API keys on the client-side.
 */
class SmsService {
  private static instance: SmsService;
  private readonly logger = console; // Replace with a more sophisticated logger if needed

  // Private constructor to enforce the singleton pattern.
  private constructor() {
    this.logger.log('SMS Service Initialized');
  }

  /**
   * Gets the singleton instance of the SmsService.
   */
  public static getInstance(): SmsService {
    if (!SmsService.instance) {
      SmsService.instance = new SmsService();
    }
    return SmsService.instance;
  }

  /**
   * Sends an SMS message via the YALURIDE backend.
   *
   * @param to The recipient's phone number in E.164 format (e.g., '+94771234567').
   * @param message The text content of the SMS message.
   * @param type The type of the message, which can help the backend select the right template or sender.
   * @returns A promise that resolves with the response from the backend.
   * @throws An error if the API call fails.
   */
  public async sendSms(
    to: string,
    message: string,
    type: SmsMessageType = SmsMessageType.GENERAL_ALERT,
  ): Promise<SendSmsResponse> {
    this.logger.info(`Preparing to send SMS of type '${type}' to ${to}`);

    if (!this.isValidE164(to)) {
      const errorMsg = 'Invalid phone number format. Number must be in E.164 format (e.g., +94771234567).';
      this.logger.error(errorMsg);
      toast.error('Invalid phone number provided.');
      throw new Error(errorMsg);
    }

    if (!message || message.trim().length === 0) {
      const errorMsg = 'SMS message content cannot be empty.';
      this.logger.error(errorMsg);
      toast.error('Cannot send an empty message.');
      throw new Error(errorMsg);
    }

    const payload: SendSmsPayload = { to, message, type };

    try {
      // The actual API call is made here to our backend endpoint.
      // The backend's notification-service will then use its secure credentials
      // to call the third-party SMS provider (e.g., Twilio).
      const response = await apiClient.post<SendSmsResponse>('/notifications/sms/send', payload);
      
      this.logger.log(`Successfully sent SMS request to backend for ${to}. Message ID: ${response.data.messageId}`);
      
      // Optionally show a success toast for non-critical messages
      if (type !== SmsMessageType.OTP) {
        toast.success('Message sent successfully!');
      }

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred.';
      this.logger.error(`Failed to send SMS to ${to}. Error: ${errorMessage}`, error);
      
      // Provide user-friendly feedback
      toast.error(`Failed to send message: ${errorMessage}`);
      
      // Re-throw the error so the calling function can handle it if needed
      throw new Error(`Failed to send SMS: ${errorMessage}`);
    }
  }

  /**
   * Validates if a phone number is in E.164 format.
   * E.g., + followed by country code and number, with no spaces or special characters.
   * @param phoneNumber The phone number string to validate.
   */
  private isValidE164(phoneNumber: string): boolean {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }
}

// Export a singleton instance of the service for easy import and use elsewhere in the app.
export const smsService = SmsService.getInstance();
