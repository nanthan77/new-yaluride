import { Injectable, Inject, OnModuleInit, InternalServerErrorException, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SERVICE_NAMES } from './api-gateway.module';

@Injectable()
export class ApiGatewayService implements OnModuleInit {
  private readonly logger = new Logger(ApiGatewayService.name);
  private clients: Map<string, ClientProxy> = new Map();

  constructor(
    @Inject(SERVICE_NAMES.USER_SERVICE) private readonly userServiceClient: ClientProxy,
    @Inject(SERVICE_NAMES.DRIVER_SERVICE) private readonly driverServiceClient: ClientProxy,
    @Inject(SERVICE_NAMES.RIDE_SERVICE) private readonly rideServiceClient: ClientProxy,
    @Inject(SERVICE_NAMES.PAYMENT_SERVICE) private readonly paymentServiceClient: ClientProxy,
    @Inject(SERVICE_NAMES.LOCATION_SERVICE) private readonly locationServiceClient: ClientProxy,
    @Inject(SERVICE_NAMES.VOICE_SERVICE) private readonly voiceServiceClient: ClientProxy,
    @Inject(SERVICE_NAMES.ADMIN_SERVICE) private readonly adminServiceClient: ClientProxy,
    @Inject(SERVICE_NAMES.ANALYTICS_SERVICE) private readonly analyticsServiceClient: ClientProxy,
    @Inject(SERVICE_NAMES.NOTIFICATION_SERVICE) private readonly notificationServiceClient: ClientProxy,
  ) {
    // Populate the clients map for easy access
    this.clients.set(SERVICE_NAMES.USER_SERVICE, this.userServiceClient);
    this.clients.set(SERVICE_NAMES.DRIVER_SERVICE, this.driverServiceClient);
    this.clients.set(SERVICE_NAMES.RIDE_SERVICE, this.rideServiceClient);
    this.clients.set(SERVICE_NAMES.PAYMENT_SERVICE, this.paymentServiceClient);
    this.clients.set(SERVICE_NAMES.LOCATION_SERVICE, this.locationServiceClient);
    this.clients.set(SERVICE_NAMES.VOICE_SERVICE, this.voiceServiceClient);
    this.clients.set(SERVICE_NAMES.ADMIN_SERVICE, this.adminServiceClient);
    this.clients.set(SERVICE_NAMES.ANALYTICS_SERVICE, this.analyticsServiceClient);
    this.clients.set(SERVICE_NAMES.NOTIFICATION_SERVICE, this.notificationServiceClient);
  }

  /**
   * On module initialization, attempt to connect to all registered microservice clients.
   * This helps in identifying connection issues early on during application startup.
   */
  async onModuleInit() {
    this.logger.log('Attempting to connect to all microservices...');
    for (const [serviceName, client] of this.clients.entries()) {
      try {
        await client.connect();
        this.logger.log(`Successfully connected to ${serviceName}`);
      } catch (err) {
        this.logger.error(`Failed to connect to ${serviceName}`, err);
      }
    }
  }

  /**
   * Generic method to forward a request to a specific microservice.
   * It uses a message pattern (command) and a payload.
   *
   * @param serviceName - The injection token of the microservice client (from SERVICE_NAMES).
   * @param command - The message pattern the microservice is listening for.
   * @param payload - The data to send with the command.
   * @returns A Promise that resolves with the response from the microservice.
   * @throws {InternalServerErrorException} If the microservice is unavailable or returns an error.
   */
  async send<TResult = any, TInput = any>(
    serviceName: string,
    command: string,
    payload: TInput,
  ): Promise<TResult> {
    const client = this.clients.get(serviceName);

    if (!client) {
      this.logger.error(`Microservice client not found for service: ${serviceName}`);
      throw new InternalServerErrorException(`Service ${serviceName} is not available.`);
    }

    try {
      // `client.send()` returns an Observable. `firstValueFrom` converts it
      // into a Promise that resolves with the first emitted value or rejects
      // if the Observable errors. This is ideal for request-response patterns.
      const response = await firstValueFrom(
        client.send<TResult, TInput>(command, payload)
      );
      return response;
    } catch (error) {
      // This catch block handles network errors (e.g., service is down)
      // or errors thrown by the microservice itself.
      this.logger.error(
        `Error communicating with ${serviceName} for command "${command}":`,
        error?.message || error,
      );

      // We throw a standardized HTTP exception, which can be caught by NestJS's
      // global exception filter to provide a consistent error response to the client.
      throw new InternalServerErrorException(
        `Failed to communicate with the ${serviceName.replace('_SERVICE', '').toLowerCase()} service.`,
      );
    }
  }

  /**
   * A method to emit an event to a specific microservice without waiting for a response.
   * This is useful for fire-and-forget operations like logging or triggering background tasks.
   *
   * @param serviceName - The injection token of the microservice client.
   * @param eventPattern - The event pattern the microservice is listening for.
   * @param payload - The data to send with the event.
   */
  emit<TInput = any>(
    serviceName: string,
    eventPattern: string,
    payload: TInput,
  ): void {
    const client = this.clients.get(serviceName);

    if (!client) {
      this.logger.error(`Microservice client not found for service: ${serviceName} to emit event.`);
      // We don't throw here as it's a fire-and-forget operation
      return;
    }

    client.emit(eventPattern, payload);
    this.logger.log(`Event "${eventPattern}" emitted to ${serviceName}.`);
  }
}
