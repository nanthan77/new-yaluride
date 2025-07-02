import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

/**
 * =======================================================================================
 * IMPORTANT SECURITY NOTE
 * =======================================================================================
 * This service handles sending SMS messages via a third-party provider (Twilio).
 * It uses sensitive API credentials (Account SID, Auth Token).
 *
 * This file MUST ONLY be executed on the backend (server-side).
 * Exposing this logic or the environment variables it uses to a frontend application
 * would create a severe security vulnerability, allowing anyone to access your
 * Twilio account and send messages at your expense.
 *
 * This service should be part of a dedicated 'notifications-service' microservice
 * and be called internally by other backend services.
 * =======================================================================================
 */

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: Twilio;
  private twilioPhoneNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioPhoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !this.twilioPhoneNumber) {
      this.logger.error('Twilio credentials are not configured in environment variables.');
      throw new InternalServerErrorException('SMS service is not configured.');
    }

    this.twilioClient = new Twilio(accountSid, authToken);
    this.logger.log('Twilio client initialized successfully.');
  }

  /**
   * Sends an SMS message to a specified phone number.
   * @param to - The recipient's phone number.
   * @param body - The content of the SMS message.
   * @returns The SID of the sent message.
   */
  async sendSms(to: string, body: string): Promise<string> {
    const formattedPhoneNumber = this._formatPhoneNumberForSriLanka(to);

    if (!formattedPhoneNumber) {
      this.logger.error(`Invalid phone number provided: ${to}`);
      throw new BadRequestException('Invalid phone number format provided.');
    }

    this.logger.log(
      `Attempting to send SMS to ${formattedPhoneNumber}. Message length: ${body.length} characters.`,
    );

    try {
      const message = await this.twilioClient.messages.create({
        body: body,
        from: this.twilioPhoneNumber,
        to: formattedPhoneNumber,
      });

      this.logger.log(`SMS sent successfully to ${formattedPhoneNumber}. Message SID: ${message.sid}`);
      return message.sid;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${formattedPhoneNumber}. Error: ${error.message}`, error.stack);
      // We throw a generic error to avoid leaking implementation details to the client.
      // The specific error is logged for debugging.
      throw new InternalServerErrorException('Failed to send SMS message.');
    }
  }

  /**
   * Formats a Sri Lankan phone number into the E.164 standard required by Twilio.
   * Handles numbers starting with '07', '7', or already formatted '+947'.
   * @param phoneNumber - The raw phone number string.
   * @returns The formatted phone number (e.g., +94771234567) or null if invalid.
   */
  private _formatPhoneNumberForSriLanka(phoneNumber: string): string | null {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    // Case 1: Already in E.164 format for Sri Lanka (e.g., +947...)
    if (digitsOnly.startsWith('947') && digitsOnly.length === 11) {
      return `+${digitsOnly}`;
    }

    // Case 2: Starts with '07' (e.g., 0771234567)
    if (digitsOnly.startsWith('07') && digitsOnly.length === 10) {
      // Replace leading '0' with '+94'
      return `+94${digitsOnly.substring(1)}`;
    }

    // Case 3: Starts with '7' (e.g., 771234567)
    if (digitsOnly.startsWith('7') && digitsOnly.length === 9) {
      return `+94${digitsOnly}`;
    }

    this.logger.warn(`Could not format phone number: ${phoneNumber}. Does not match known Sri Lankan formats.`);
    return null; // Return null if format is unrecognized
  }
}
