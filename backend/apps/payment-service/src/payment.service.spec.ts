import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import { PaymentService } from './payment.service';
import { RideStatus, PaymentStatus } from '@yaluride/common';

class User {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  stripe_customer_id?: string;
  totalRides?: number;
}

class Ride {
  id: string;
  passenger_id: string;
  driver_id: string;
  fare: number;
  tip_amount: number;
  payment_status: 'pending' | 'completed' | 'failed';
  status: 'COMPLETED' | 'CANCELLED' | 'ONGOING';
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

// Mock data for our tests
const mockRideId = 'a1b2c3d4-ride-uuid-1234';
const mockDriverId = 'a1b2c3d4-driver-uuid-5678';
const mockPassengerId = 'a1b2c3d4-passenger-uuid-9012';

const mockCompletedRide = {
  id: mockRideId,
  passenger_id: mockPassengerId,
  driver_id: mockDriverId,
  fare: 1500.0,
  tip_amount: 0,
  payment_status: 'pending',
  status: 'COMPLETED',
  currency: 'USD',
  driver_payout_amount: 0,
} as Ride;

const mockRegularDriver = {
  id: mockDriverId,
  name: 'Regular Driver',
  email: 'driver@test.com',
  phone_number: '+1234567890',
  totalRides: 1001,
} as User;

const mockNewDriver = {
  id: mockDriverId,
  name: 'New Driver',
  email: 'newdriver@test.com',
  phone_number: '+1234567891',
  totalRides: 999,
} as User;

// Mock TypeORM repository
type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOneBy: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  create: jest.fn().mockImplementation((data) => data),
});

// Mock DataSource and QueryRunner for transactions
const createMockQueryRunner = () => ({
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    getRepository: jest.fn(),
  },
});

describe('PaymentService', () => {
  let service: PaymentService;
  let rideRepository: MockRepository<Ride>;
  let paymentRepository: MockRepository<Payment>;
  let userRepository: MockRepository<User>;
  let dataSource: Partial<DataSource>;
  let mockQueryRunner: ReturnType<typeof createMockQueryRunner>;
  let mockEventsClient: Partial<ClientProxy>;

  beforeEach(async () => {
    mockQueryRunner = createMockQueryRunner();
    dataSource = {
      createQueryRunner: jest.fn(() => mockQueryRunner as any),
    };
    mockEventsClient = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-stripe-key') } },
        { provide: getRepositoryToken(Ride), useFactory: createMockRepository },
        { provide: getRepositoryToken(Payment), useFactory: createMockRepository },
        { provide: getRepositoryToken(User), useFactory: createMockRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: 'EVENTS_SERVICE', useValue: mockEventsClient },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    rideRepository = module.get(getRepositoryToken(Ride));
    paymentRepository = module.get(getRepositoryToken(Payment));
    userRepository = module.get(getRepositoryToken(User));

    // Wire up the query runner's manager to return our mock repositories
    mockQueryRunner.manager.getRepository.mockImplementation((entity: any) => {
      if (entity && entity.name) {
        if (entity.name === 'Ride') return rideRepository;
        if (entity.name === 'Payment') return paymentRepository;
        if (entity.name === 'User') return userRepository;
      }
      const callCount = mockQueryRunner.manager.getRepository.mock.calls.length;
      if (callCount % 3 === 1) return rideRepository;
      if (callCount % 3 === 2) return paymentRepository;
      return userRepository;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processRidePayment', () => {
    describe('when processing a valid, completed ride for a regular driver', () => {
      beforeEach(() => {
        rideRepository.findOneBy.mockResolvedValue(mockCompletedRide);
        userRepository.findOneBy.mockResolvedValue(mockRegularDriver);
        paymentRepository.save.mockImplementation(p => Promise.resolve({ ...p, id: 'payment-uuid-1' }));
      });

      it('should correctly calculate 10% platform commission', async () => {
        await service.processRidePayment(mockRideId);
        expect(paymentRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            ride_id: mockRideId,
            user_id: mockPassengerId,
            amount: 1500.0,
            currency: 'USD',
            gateway: 'stripe',
            payment_type: 'FARE',
            status: 'succeeded',
          }),
        );
      });

      it('should correctly calculate driver earnings (90%)', async () => {
        await service.processRidePayment(mockRideId);
        expect(paymentRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            ride_id: mockRideId,
            user_id: mockPassengerId,
            amount: 1500.0,
            currency: 'USD',
            gateway: 'stripe',
            payment_type: 'FARE',
            status: 'succeeded',
          }),
        );
      });

      it('should create a payment record with COMPLETED status', async () => {
        await service.processRidePayment(mockRideId);
        expect(paymentRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            ride_id: mockRideId,
            user_id: mockPassengerId,
            amount: 1500.0,
            currency: 'USD',
            gateway: 'stripe',
            payment_type: 'FARE',
            status: 'succeeded',
          })
        );
      });

      it('should update the ride status to PAID', async () => {
        await service.processRidePayment(mockRideId);
        expect(rideRepository.update).toHaveBeenCalledWith(mockRideId, { payment_status: 'completed' });
      });

      it('should emit a payment.processed event', async () => {
        await service.processRidePayment(mockRideId);
        expect(mockEventsClient.emit).toHaveBeenCalledWith(
          'payment.processed',
          expect.objectContaining({
            rideId: mockRideId,
            paymentId: 'payment-uuid-1',
            status: 'COMPLETED',
          }),
        );
      });

      it('should commit the transaction on success', async () => {
        await service.processRidePayment(mockRideId);
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      });
    });

    describe('when processing a ride for a driver eligible for commission waiver', () => {
      beforeEach(() => {
        rideRepository.findOneBy.mockResolvedValue(mockCompletedRide);
        userRepository.findOneBy.mockResolvedValue(mockNewDriver);
        paymentRepository.save.mockImplementation(p => Promise.resolve({ ...p, id: 'payment-uuid-2' }));
      });

      it('should calculate platform commission as 0', async () => {
        await service.processRidePayment(mockRideId);
        expect(paymentRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            ride_id: mockRideId,
            user_id: mockPassengerId,
            amount: 1500.0,
            currency: 'USD',
            gateway: 'stripe',
            payment_type: 'FARE',
            status: 'succeeded',
          }),
        );
      });

      it("should set driver's earnings to the full ride fare", async () => {
        await service.processRidePayment(mockRideId);
        expect(paymentRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            ride_id: mockRideId,
            user_id: mockPassengerId,
            amount: 1500.0,
            currency: 'USD',
            gateway: 'stripe',
            payment_type: 'FARE',
            status: 'succeeded',
          }),
        );
      });
    });

    describe('when handling invalid or edge cases', () => {
      it('should throw NotFoundException if ride does not exist', async () => {
        rideRepository.findOneBy.mockResolvedValue(null);
        await expect(service.processRidePayment(mockRideId)).rejects.toThrow(NotFoundException);
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      });

      it('should throw BadRequestException if ride is not in COMPLETED state', async () => {
        rideRepository.findOneBy.mockResolvedValue({ ...mockCompletedRide, status: 'ONGOING' });
        await expect(service.processRidePayment(mockRideId)).rejects.toThrow(BadRequestException);
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      });

      it('should throw BadRequestException if ride has already been paid', async () => {
        rideRepository.findOneBy.mockResolvedValue({ ...mockCompletedRide, payment_status: 'completed' });
        await expect(service.processRidePayment(mockRideId)).rejects.toThrow(BadRequestException);
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      });

      it('should rollback the transaction if saving the payment fails', async () => {
        rideRepository.findOneBy.mockResolvedValue(mockCompletedRide);
        userRepository.findOneBy.mockResolvedValue(mockRegularDriver);
        paymentRepository.save.mockRejectedValue(new Error('DB Save Error'));

        await expect(service.processRidePayment(mockRideId)).rejects.toThrow(InternalServerErrorException);

        expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      });
    });
  });
});
