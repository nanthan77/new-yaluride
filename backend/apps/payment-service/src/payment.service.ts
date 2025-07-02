import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Stripe from 'stripe';
import * as crypto from 'crypto';
import { ClientProxy } from '@nestjs/microservices';

// --- Placeholder Entities (replace with actual imports from libs) ---
// These would typically be in a shared library, e.g., `@yaluride/database-entities`
class User {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  stripe_customer_id?: string; // Crucial for processing payments
}

class Ride {
  id: string;
  passenger_id: string;
  driver_id: string;
  fare: number;
  tip_amount: number;
  payment_status: 'pending' | 'completed' | 'failed';
  status: 'COMPLETED' | 'CANCELLED' | 'ONGOING'; // Added more statuses for clarity
  currency: string;
  driver_payout_amount: number;
}

class Payment {
  id: string;
  ride_id: string;
  user_id: string;
  amount: number;
  currency: string;
  gateway: 'stripe' | 'payhere';
  transaction_id: string;
  payment_type: 'FARE' | 'TIP';
  status: 'succeeded' | 'pending' | 'failed';
}
// --- End Placeholder Entities ---


export interface PaymentIntentResponse {
  gateway: 'stripe' | 'payhere';
  payload: {
    // Stripe
    clientSecret?: string;
    // PayHere
    merchant_id?: string;
    return_url?: string;
    cancel_url?: string;
    notify_url?: string;
    order_id?: string;
    items?: string;
    currency?: string;
    amount?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    hash?: string;
  };
}

const COMMISSION_RATE = 0.10; // 10%
const COMMISSION_WAIVER_DRIVER_COUNT = 1000;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe;
  private payhereMerchantId: string;
  private payhereMerchantSecret: string;

  constructor(
    private configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject('EVENTS_SERVICE') private readonly eventsClient: ClientProxy,
  ) {
    // --- Initialize Stripe ---
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.error('Stripe secret key is not configured. Set STRIPE_SECRET_KEY in environment variables.');
      throw new InternalServerErrorException('Payment service (Stripe) is not configured.');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-04-10',
      typescript: true,
    });
    this.logger.log('Stripe client initialized.');

    // --- Initialize PayHere ---
    this.payhereMerchantId = this.configService.get<string>('PAYHERE_MERCHANT_ID');
    this.payhereMerchantSecret = this.configService.get<string>('PAYHERE_MERCHANT_SECRET');
    if (!this.payhereMerchantId || !this.payhereMerchantSecret) {
      this.logger.error('PayHere credentials are not configured. Set PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET.');
      throw new InternalServerErrorException('Payment service (PayHere) is not configured.');
    }
    this.logger.log('PayHere credentials loaded.');
  }

  /**
   * Creates a payment intent with the appropriate gateway based on currency.
   */
  async createPaymentIntent(/*...args*/): Promise<PaymentIntentResponse> {
    // ... existing implementation
    return {} as any; // Placeholder
  }

  // ... existing createStripeIntent and createPayHereIntent methods

  /**
   * Processes a tip payment from a passenger to a driver for a completed ride.
   * This operation is atomic and uses a database transaction.
   * @param rideId - The ID of the ride to add the tip to.
   * @param tipAmount - The amount of the tip.
   * @param passengerId - The ID of the passenger giving the tip.
   * @returns An object confirming the success and details of the transaction.
   */
  async processTipPayment(rideId: string, tipAmount: number, passengerId: string) {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const rideRepo = transactionalEntityManager.getRepository(Ride);
      const paymentRepo = transactionalEntityManager.getRepository(Payment);
      const userRepo = transactionalEntityManager.getRepository(User);

      // 1. Validate the ride and passenger
      const ride = await rideRepo.findOneBy({ id: rideId });
      if (!ride) {
        throw new NotFoundException(`Ride with ID ${rideId} not found.`);
      }
      if (ride.status !== 'COMPLETED') {
        throw new BadRequestException('Tips can only be added to completed rides.');
      }
      if (ride.passenger_id !== passengerId) {
        throw new ForbiddenException('You can only add a tip to your own ride.');
      }
      if (ride.tip_amount > 0) {
        throw new BadRequestException('A tip has already been added to this ride.');
      }

      // 2. Get passenger's payment details
      const passenger = await userRepo.findOneBy({ id: passengerId });
      if (!passenger?.stripe_customer_id) {
        throw new BadRequestException('No saved payment method found for this user.');
      }

      // 3. Charge the passenger using Stripe (off-session)
      let paymentIntent: Stripe.PaymentIntent;
      try {
        const amountInCents = Math.round(tipAmount * 100);
        paymentIntent = await this.stripe.paymentIntents.create({
          amount: amountInCents,
          currency: ride.currency.toLowerCase(),
          customer: passenger.stripe_customer_id,
          payment_method: passenger.default_payment_method_id, // Assuming this is stored on the user profile
          off_session: true,
          confirm: true,
          metadata: {
            ride_id: rideId,
            payment_type: 'TIP',
            passenger_id: passengerId,
            driver_id: ride.driver_id,
          },
        });

        if (paymentIntent.status !== 'succeeded') {
          throw new InternalServerErrorException(`Stripe charge failed: ${paymentIntent.last_payment_error?.message}`);
        }
        this.logger.log(`Stripe charge successful for tip on ride ${rideId}. Transaction ID: ${paymentIntent.id}`);
      } catch (error) {
        this.logger.error(`Failed to process Stripe tip payment for ride ${rideId}:`, error.stack);
        throw new InternalServerErrorException(`Payment processing failed: ${error.message}`);
      }
      
      // 4. Update database records within the transaction
      // Update the ride with the tip amount
      await rideRepo.update(rideId, {
        tip_amount: tipAmount,
        // Optionally update the total driver payout
        driver_payout_amount: ride.driver_payout_amount + tipAmount,
      });

      // Create a new payment record for the tip
      const tipPayment = paymentRepo.create({
        ride_id: rideId,
        user_id: passengerId,
        amount: tipAmount,
        currency: ride.currency,
        gateway: 'stripe',
        transaction_id: paymentIntent.id,
        payment_type: 'TIP',
        status: 'succeeded',
      });
      await paymentRepo.save(tipPayment);

      this.logger.log(`Database updated for tip on ride ${rideId}.`);

      // 5. Emit event after transaction commits (handled by NestJS event system or manually after transaction)
      // This is conceptually what happens next. The actual emission is outside the transaction block.
      
      return {
        success: true,
        message: 'Tip processed successfully.',
        transactionId: paymentIntent.id,
        rideId: rideId,
        tipAmount: tipAmount,
      };
    }).then(result => {
        // 6. Emit event now that the transaction is successfully committed
        this.eventsClient.emit('payment.tip.processed', {
            rideId: result.rideId,
            driverId: ride.driver_id,
            tipAmount: result.tipAmount,
        });
        this.logger.log(`Emitted 'payment.tip.processed' event for ride ${result.rideId}.`);
        return result;
    }).catch(error => {
        // The transaction has already been rolled back by TypeORM
        this.logger.error(`Transaction for tip payment on ride ${rideId} failed and was rolled back.`, error.stack);
        // Re-throw the original error to be handled by NestJS exception filters
        throw error;
    });
  }

  // ... existing webhook handlers and other methods

  private async processSuccessfulPayment(rideId: string, amount: number, gateway: string, transactionId: string) {
    // ... existing implementation
  }

  private async isDriverEligibleForCommissionWaiver(driverId: string): Promise<boolean> {
    // ... existing implementation
    return false; // Placeholder
  }
}
