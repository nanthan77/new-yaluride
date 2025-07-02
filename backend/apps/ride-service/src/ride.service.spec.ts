import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import {
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';

import { RideService } from './ride.service';
import { MatchingService } from '../matching/matching.service';
import { PaymentService } from '../../payment-service/src/payment.service'; // Adjust path as needed
import { Ride, RideStatus } from '../../../../libs/database/src/entities/ride.entity';
import { Driver, DriverStatus } from '../../../../libs/database/src/entities/driver.entity';
import { User } from '../../../../libs/database/src/entities/user.entity';
import { UserRole } from '../../../../libs/common/src/enums/user.enums';

// --- Mock Data ---
const mockPassenger: User = {
  id: 'passenger-uuid-123',
  role: UserRole.PASSENGER,
  // ... other user properties
} as User;

const mockDriverUser: User = {
  id: 'driver-user-uuid-456',
  role: UserRole.DRIVER,
} as User;

const mockAvailableDriver: Driver = {
  id: 'driver-profile-uuid-789',
  user_id: 'driver-user-uuid-456',
  status: DriverStatus.AVAILABLE,
  user: mockDriverUser,
  // ... other driver properties
} as Driver;

const mockRideRequestPayload = {
  passengerId: mockPassenger.id,
  pickupLocation: { type: 'Point', coordinates: [80.635, 7.2906] }, // Kandy
  dropoffLocation: { type: 'Point', coordinates: [79.8612, 6.9271] }, // Colombo
};

const mockRide: Ride = {
  id: 'ride-uuid-abc',
  passenger_id: mockPassenger.id,
  driver_id: null,
  status: RideStatus.REQUESTED,
  fare: 5000,
  // ... other ride properties
} as Ride;

// --- Mock Implementations ---
const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
};

const mockMatchingService = {
  findBestDriverForRide: jest.fn(),
};

const mockPaymentService = {
  processRidePayment: jest.fn(),
};

const mockEventsClient = {
  emit: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn().mockImplementation(async (callback) => {
    // Simulate transaction by just running the callback with mock repositories
    const manager = {
      getRepository: (entity: any) => {
        if (entity.name === 'Ride') return mockRepository;
        if (entity.name === 'Driver') return mockRepository;
        return mockRepository;
      },
    };
    return callback(manager);
  }),
};

describe('RideService', () => {
  let service: RideService;
  let rideRepository: Repository<Ride>;
  let driverRepository: Repository<Driver>;
  let matchingService: MatchingService;
  let paymentService: PaymentService;
  let eventsClient: ClientProxy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RideService,
        { provide: getRepositoryToken(Ride), useValue: mockRepository },
        { provide: getRepositoryToken(Driver), useValue: mockRepository },
        { provide: 'MATCHING_SERVICE', useValue: mockMatchingService },
        { provide: 'PAYMENT_SERVICE', useValue: mockPaymentService },
        { provide: 'EVENTS_SERVICE', useValue: mockEventsClient },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<RideService>(RideService);
    rideRepository = module.get<Repository<Ride>>(getRepositoryToken(Ride));
    driverRepository = module.get<Repository<Driver>>(getRepositoryToken(Driver));
    matchingService = module.get<MatchingService>('MATCHING_SERVICE');
    paymentService = module.get<PaymentService>('PAYMENT_SERVICE');
    eventsClient = module.get<ClientProxy>('EVENTS_SERVICE');

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRide', () => {
    it('should successfully create a ride and assign a driver', async () => {
      mockMatchingService.findBestDriverForRide.mockResolvedValue(mockAvailableDriver);
      mockRepository.create.mockReturnValue(mockRide);
      mockRepository.save.mockResolvedValue({ ...mockRide, driver_id: mockAvailableDriver.id, status: RideStatus.ACCEPTED });

      const result = await service.createRide(mockRideRequestPayload);

      expect(matchingService.findBestDriverForRide).toHaveBeenCalledWith(mockRideRequestPayload.pickupLocation);
      expect(rideRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        passenger_id: mockPassenger.id,
        status: RideStatus.REQUESTED,
      }));
      expect(rideRepository.save).toHaveBeenCalled();
      expect(eventsClient.emit).toHaveBeenCalledWith('ride.requested', expect.any(Object));
      expect(eventsClient.emit).toHaveBeenCalledWith('ride.accepted', expect.any(Object));
      expect(result.status).toBe(RideStatus.ACCEPTED);
      expect(result.driver_id).toBe(mockAvailableDriver.id);
    });

    it('should throw NotFoundException if no drivers are available', async () => {
      mockMatchingService.findBestDriverForRide.mockResolvedValue(null);

      await expect(service.createRide(mockRideRequestPayload)).rejects.toThrow(NotFoundException);
      expect(rideRepository.create).not.toHaveBeenCalled();
      expect(eventsClient.emit).not.toHaveBeenCalled();
    });
  });

  describe('acceptRide', () => {
    it('should allow a driver to accept a requested ride', async () => {
      const requestedRide = { ...mockRide, status: RideStatus.REQUESTED, id: 'ride-to-accept' };
      mockRepository.findOneBy.mockResolvedValue(requestedRide);
      mockRepository.save.mockResolvedValue({ ...requestedRide, status: RideStatus.ACCEPTED, driver_id: mockAvailableDriver.id });

      const result = await service.acceptRide('ride-to-accept', mockAvailableDriver.id);

      expect(rideRepository.findOneBy).toHaveBeenCalledWith({ id: 'ride-to-accept' });
      expect(rideRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        status: RideStatus.ACCEPTED,
        driver_id: mockAvailableDriver.id,
      }));
      expect(eventsClient.emit).toHaveBeenCalledWith('ride.accepted', expect.any(Object));
      expect(result.status).toBe(RideStatus.ACCEPTED);
    });

    it('should throw NotFoundException if ride to accept does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      await expect(service.acceptRide('nonexistent-ride', mockAvailableDriver.id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if ride is not in REQUESTED state', async () => {
      const ongoingRide = { ...mockRide, status: RideStatus.ONGOING };
      mockRepository.findOneBy.mockResolvedValue(ongoingRide);
      await expect(service.acceptRide(ongoingRide.id, mockAvailableDriver.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('startRide', () => {
    it('should allow the assigned driver to start the ride', async () => {
      const acceptedRide = { ...mockRide, status: RideStatus.ACCEPTED, driver_id: mockAvailableDriver.id };
      mockRepository.findOneBy.mockResolvedValue(acceptedRide);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.startRide(acceptedRide.id, mockAvailableDriver.id);

      expect(rideRepository.update).toHaveBeenCalledWith(acceptedRide.id, {
        status: RideStatus.ONGOING,
        started_at: expect.any(Date),
      });
      expect(eventsClient.emit).toHaveBeenCalledWith('ride.started', expect.any(Object));
    });

    it('should throw ForbiddenException if a different driver tries to start the ride', async () => {
      const acceptedRide = { ...mockRide, status: RideStatus.ACCEPTED, driver_id: 'another-driver-id' };
      mockRepository.findOneBy.mockResolvedValue(acceptedRide);
      await expect(service.startRide(acceptedRide.id, mockAvailableDriver.id)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('completeRide', () => {
    it('should allow the driver to complete the ride and trigger payment', async () => {
      const ongoingRide = { ...mockRide, status: RideStatus.ONGOING, driver_id: mockAvailableDriver.id, fare: 5000 };
      mockRepository.findOneBy.mockResolvedValue(ongoingRide);
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockPaymentService.processRidePayment.mockResolvedValue({ success: true });

      await service.completeRide(ongoingRide.id, mockAvailableDriver.id);

      expect(rideRepository.update).toHaveBeenCalledWith(ongoingRide.id, {
        status: RideStatus.COMPLETED,
        completed_at: expect.any(Date),
      });
      expect(paymentService.processRidePayment).toHaveBeenCalledWith(ongoingRide.id, ongoingRide.fare);
      expect(eventsClient.emit).toHaveBeenCalledWith('ride.completed', expect.any(Object));
    });

    it('should throw an error if payment processing fails', async () => {
        const ongoingRide = { ...mockRide, status: RideStatus.ONGOING, driver_id: mockAvailableDriver.id, fare: 5000 };
        mockRepository.findOneBy.mockResolvedValue(ongoingRide);
        mockPaymentService.processRidePayment.mockRejectedValue(new Error('Payment failed'));
  
        await expect(service.completeRide(ongoingRide.id, mockAvailableDriver.id)).rejects.toThrow(InternalServerErrorException);
        expect(rideRepository.update).not.toHaveBeenCalled(); // Ensure ride status is not updated if payment fails
    });
  });

  describe('cancelRide', () => {
    it('should allow a passenger to cancel a requested ride', async () => {
      const requestedRide = { ...mockRide, status: RideStatus.REQUESTED, passenger_id: mockPassenger.id };
      mockRepository.findOneBy.mockResolvedValue(requestedRide);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.cancelRide(requestedRide.id, mockPassenger.id);

      expect(rideRepository.update).toHaveBeenCalledWith(requestedRide.id, {
        status: RideStatus.CANCELLED_BY_PASSENGER,
      });
      expect(eventsClient.emit).toHaveBeenCalledWith('ride.cancelled', expect.any(Object));
    });

    it('should allow a driver to cancel an accepted ride', async () => {
        const acceptedRide = { ...mockRide, status: RideStatus.ACCEPTED, driver_id: mockAvailableDriver.id };
        mockRepository.findOneBy.mockResolvedValue(acceptedRide);
        mockRepository.update.mockResolvedValue({ affected: 1 });
  
        await service.cancelRide(acceptedRide.id, mockAvailableDriver.id);
  
        expect(rideRepository.update).toHaveBeenCalledWith(acceptedRide.id, {
          status: RideStatus.CANCELLED_BY_DRIVER,
        });
        expect(eventsClient.emit).toHaveBeenCalledWith('ride.cancelled', expect.any(Object));
    });

    it('should throw ForbiddenException if user is not part of the ride', async () => {
        const requestedRide = { ...mockRide, status: RideStatus.REQUESTED, passenger_id: 'another-passenger', driver_id: 'another-driver' };
        mockRepository.findOneBy.mockResolvedValue(requestedRide);
        await expect(service.cancelRide(requestedRide.id, 'unauthorized-user-id')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if trying to cancel a completed ride', async () => {
        const completedRide = { ...mockRide, status: RideStatus.COMPLETED, passenger_id: mockPassenger.id };
        mockRepository.findOneBy.mockResolvedValue(completedRide);
        await expect(service.cancelRide(completedRide.id, mockPassenger.id)).rejects.toThrow(BadRequestException);
    });
  });
});
