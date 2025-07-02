import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  Req,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
  ApiHeader,
} from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, IsOptional, IsEmail, IsPhoneNumber } from 'class-validator';
import { Type, plainToInstance } from 'class-transformer';

import { PaymentService, PaymentIntentResponse } from './payment.service';
import { JwtAuthGuard } from '@yaluride/auth';
import { UserDecorator } from '@yaluride/common';
import { User } from '@yaluride/database';


// --- Data Transfer Objects (DTOs) for Controller ---

class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'The unique identifier for the ride being paid for.',
    example: 'c1b9a7a0-5c3c-4e3d-8f1a-2b4c6d8e0f9a',
  })
  @IsString()
  @IsNotEmpty()
  rideId: string;

  @ApiProperty({
    description: 'The amount to be charged, in the specified currency (e.g., 1500.50 for LKR).',
    example: 1500.50,
  })
  @IsNumber()
  @Min(50) // Minimum payment amount, e.g., LKR 50.00
  amount: number;

  @ApiProperty({
    description: 'The ISO 4217 currency code (e.g., LKR, USD). Determines the payment gateway.',
    example: 'LKR',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;
}

/**
 * DTO for processing a tip after the ride has been completed.
 */
class ProcessTipDto {
  @ApiProperty({
    description: 'The unique identifier for the ride receiving the tip.',
    example: 'c1b9a7a0-5c3c-4e3d-8f1a-2b4c6d8e0f9a',
  })
  @IsString()
  @IsNotEmpty()
  rideId: string;

  @ApiProperty({
    description: 'Tip amount in the ride currency (e.g., 250.00 for LKR).',
    example: 250.0,
  })
  @IsNumber()
  @Min(10) // Minimum tip amount, adjust as required
  tipAmount: number;
}

class PayhereWebhookDto {
    @ApiProperty() @IsOptional() merchant_id: string;
    @ApiProperty() @IsOptional() order_id: string;
    @ApiProperty() @IsOptional() payment_id: string;
    @ApiProperty() @IsOptional() payhere_amount: string;
    @ApiProperty() @IsOptional() payhere_currency: string;
    @ApiProperty() @IsOptional() status_code: string;
    @ApiProperty() @IsOptional() md5sig: string;
    @ApiProperty() @IsOptional() custom_1: string;
    @ApiProperty() @IsOptional() custom_2: string;
    // Add other fields from PayHere notification as needed
}


// --- Controller ---

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a Payment Intent',
    description: 'Initiates a payment process for a ride by creating a payment intent with the appropriate gateway (Stripe for international, PayHere for LKR). Returns the necessary client secret or payload for the frontend to proceed.',
  })
  @ApiBody({ type: CreatePaymentIntentDto })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully.', type: Object }) // Type should be more specific if possible
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error - Could not create payment intent.' })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @UserDecorator() user: User,
  ): Promise<PaymentIntentResponse> {
    this.logger.log(`User ${user.id} creating payment intent for ride ${createPaymentIntentDto.rideId}`);
    
    // Construct user details required by PayHere
    const userDetails = {
        firstName: user.fullName.split(' ')[0] || 'YALURIDE',
        lastName: user.fullName.split(' ').slice(1).join(' ') || 'User',
        email: user.email || 'support@yaluride.com', // Use a fallback email
        phone: user.phoneNumber,
    };

    return this.paymentService.createPaymentIntent(
      createPaymentIntentDto.amount,
      createPaymentIntentDto.currency,
      createPaymentIntentDto.rideId,
      userDetails,
    );
  }

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe Webhook Handler',
    description: 'Public endpoint to receive webhook events from Stripe. It verifies the event signature and processes payment status updates. This endpoint requires the raw request body.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Signature provided by Stripe to verify the webhook authenticity.',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook received and acknowledged.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid signature or payload.' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!signature) {
        throw new BadRequestException('Missing Stripe signature header.');
    }
    if (!request.rawBody) {
        throw new InternalServerErrorException('Raw body not available. Ensure `rawBody: true` is set in main.ts for the NestJS application.');
    }
    await this.paymentService.handleStripeWebhook(request.rawBody, signature);
    return { received: true };
  }

  @Post('webhooks/payhere')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PayHere Webhook Handler',
    description: 'Public endpoint to receive server-to-server notifications from PayHere. It verifies the MD5 signature and processes payment status updates.',
  })
  @ApiBody({
    type: PayhereWebhookDto,
    description: 'Payload sent by PayHere as application/x-www-form-urlencoded.',
  })
  @ApiResponse({ status: 200, description: 'Webhook received and acknowledged.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid signature or payload.' })
  async handlePayHereWebhook(
    @Body() payhereDto: PayhereWebhookDto,
  ) {
    this.logger.log(`Received PayHere webhook for order ID: ${payhereDto.order_id}`);
    await this.paymentService.handlePayHereWebhook(payhereDto);
    // PayHere does not require a specific response body, just a 200 OK status.
    return;
  }

  /* ------------------------------------------------------------------
   *  POST /payments/process-tip
   * ------------------------------------------------------------------ */
  @Post('process-tip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process Tip Payment',
    description: 'Processes a tip payment to the driver for a completed ride.',
  })
  @ApiBody({ type: ProcessTipDto })
  @ApiResponse({ status: 200, description: 'Tip processed successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error - Could not process tip.' })
  async processTip(
    @Body() processTipDto: ProcessTipDto,
    @UserDecorator() user: User,
  ) {
    this.logger.log(`User ${user.id} sending tip for ride ${processTipDto.rideId}`);

    const result = await this.paymentService.processTipPayment(
      processTipDto.rideId,
      processTipDto.tipAmount,
      user.id,
    );

    return { success: true, ...result };
  }
}
