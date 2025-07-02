import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import { PaymentService } from './payment.service';
import { Ride, Payment, Driver, User } from '@yaluride/database';
import { RideStatus, PaymentStatus } from '@yaluride/common';

// Mock data for our tests
const mockRideId = 'a1b2c3d4-ride-uuid-1234';
const mockDriverId = 'a1b2c3d4-driver-uuid-5678';
const mockPassengerId = 'a1b2c3d4-passenger-uuid-9012';

const mockCompletedRide = {
  id: mockRideId,
  passengerId: mockPassengerId,
  driverId: mockDriverId,
  pickupLocation: 'Test Pickup',
  dropoffLocation: 'Test Dropoff',
  fare: 1500.0,
  status: RideStatus.COMPLETED,
  paymentStatus: PaymentStatus.PENDING,
  scheduledAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Ride;

const mockRegularDriver = {
  id: mockDriverId,
  userId: mockDriverId,
  licenseNumber: 'DL123456',
  rating: 4.5,
  totalRides: 1001,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Driver;

const mockNewDriver = {
  id: mockDriverId,
  userId: mockDriverId,
  licenseNumber: 'DL999999',
  rating: 4.0,
  totalRides: 999,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Driver;

// Mock TypeORM repository
type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOneBy: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
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
  let driverRepository: MockRepository<Driver>;
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
        { provide: getRepositoryToken(Ride), useFactory: createMockRepository },
        { provide: getRepositoryToken(Payment), useFactory: createMockRepository },
        { provide: getRepositoryToken(Driver), useFactory: createMockRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: 'PAYMENT_EVENTS_SERVICE', useValue: mockEventsClient },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    rideRepository = module.get(getRepositoryToken(Ride));
    paymentRepository = module.get(getRepositoryToken(Payment));
    driverRepository = module.get(getRepositoryToken(Driver));

    // Wire up the query runner's manager to return our mock repositories
    mockQueryRunner.manager.getRepository.mockImplementation((entity: any) => {
      if (entity === Ride) return rideRepository;
      if (entity === Payment) return paymentRepository;
      if (entity === Driver) return driverRepository;
      throw new Error(`Mock repository for ${entity.name} not found`);
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
        driverRepository.findOneBy.mockResolvedValue(mockRegularDriver);
        paymentRepository.save.mockImplementation(p => Promise.resolve({ ...p, id: 'payment-uuid-1' }));
      });

      it('should correctly calculate 10% platform commission', async () => {
        await service.processTipPayment(mockRideId, 150.0, mockPassengerId);
        const expectedCommission = 1500.0 * 0.1;
        expect(paymentRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            platform_commission: expectedCommission,
          }),
        );
      });

      it('should correctly calculate driver earnings (90%)', async () => {
        await service.processTipPayment(mockRideId, 150.0, mockPassengerId);
        const expectedEarnings = 1500.0 * 0.9;
        expect(paymentRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            driver_earnings: expectedEarnings,
          }),
        );
      });

      it('should create a payment record with COMPLETED status', async () => {
        await service.processTipPayment(mockRideId, 150.0, mockPassengerId);
        expect(paymentRepository.save).toHaveBeenCalledWith({
          ride_id: mockRideId,
          passenger_id: mockPassengerId,
          driver_id: mockDriverId,
          amount: 1500.0,
          platform_commission: 150.0,
          driver_earnings: 1350.0,
          status: PaymentStatus.COMPLETED,
          provider: 'SYSTEM', // Assuming system processing for now
        });
      });

      it('should update the ride status to PAID', async () => {
        await service.processTipPayment(mockRideId, 150.0, mockPassengerId);
        expect(rideRepository.update).toHaveBeenCalledWith(mockRideId, { is_paid: true });
      });

      it('should emit a payment.processed event', async () => {
        await service.processTipPayment(mockRideId, 150.0, mockPassengerId);
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
        await service.processTipPayment(mockRideId, 150.0, mockPassengerId);
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      });
    });

    describe('when processing a ride for a driver eligible for commission waiver', () => {
      beforeEach(() => {
        rideRepository.findOneBy.mockResolvedValue(mockCompletedRide);
        driverRepository.findOneBy.mockResolvedValue(mockNewDriver);
        paymentRepository.save.mockImplementation(p => Promise.resolve({ ...p, id: 'payment-uuid-2' }));
      });

      it('should calculate platform commission as 0', async () => {
        await service.processTipPayment(mockRideId, 150.0, mockPassengerId);
        expect(paymentRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ platform_commission: 0 }),
        );
      });

      it("should set driver's earnings to the full ride fare", async () => {
        await service.processTipPayment(mockRideId, 150.0, mockPassengerId);
        expect(paymentRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ driver_earnings: 1500.0 }),
        );
      });
    });

    describe('when handling invalid or edge cases', () => {
      it('should throw NotFoundException if ride does not exist', async () => {
        rideRepository.findOneBy.mockResolvedValue(null);
        await expect(service.processTipPayment(mockRideId, 150.0, mockPassengerId)).rejects.toThrow(NotFoundException);
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      });

      it('should throw BadRequestException if ride is not in COMPLETED state', async () => {
        rideRepository.findOneBy.mockResolvedValue({ ...mockCompletedRide, status: RideStatus.ONGOING });
        await expect(service.processTipPayment(mockRideId, 150.0, mockPassengerId)).rejects.toThrow(BadRequestException);
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      });

      it('should throw BadRequestException if ride has already been paid', async () => {
        rideRepository.findOneBy.mockResolvedValue({ ...mockCompletedRide, is_paid: true });
        await expect(service.processTipPayment(mockRideId, 150.0, mockPassengerId)).rejects.toThrow(BadRequestException);
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      });

      it('should rollback the transaction if saving the payment fails', async () => {
        rideRepository.findOneBy.mockResolvedValue(mockCompletedRide);
        driverRepository.findOneBy.mockResolvedValue(mockRegularDriver);
        paymentRepository.save.mockRejectedValue(new Error('DB Save Error'));

        await expect(service.processTipPayment(mockRideId, 150.0, mockPassengerId)).rejects.toThrow(InternalServerErrorException);

        expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      });
    });
  });
});
