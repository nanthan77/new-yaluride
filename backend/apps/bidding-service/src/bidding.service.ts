import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Bid, BidStatus } from './core/entities/bid.entity';
import { Journey, JourneyStatus } from '../../journey/src/core/entities/journey.entity';
import { CreateBidDto } from './core/dto/bidding.dto';
import { User } from '../../../../libs/common/src/types/user.type';

@Injectable()
export class BiddingService {
  private readonly logger = new Logger(BiddingService.name);

  constructor(
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    @InjectRepository(Journey)
    private readonly journeyRepository: Repository<Journey>,
    @Inject('YALURIDE_EVENTS') private readonly eventEmitter: ClientProxy,
  ) {}

  /**
   * Creates a new bid on a journey for a driver.
   * @param createBidDto - The data for creating the bid.
   * @param driverId - The ID of the driver placing the bid.
   * @returns The newly created Bid entity.
   */
  async createBid(createBidDto: CreateBidDto, driverId: string): Promise<Bid> {
    const { journeyId, amount, message } = createBidDto;

    const journey = await this.journeyRepository.findOneBy({ id: journeyId });

    if (!journey) {
      throw new NotFoundException(`Journey with ID "${journeyId}" not found.`);
    }

    if (journey.status !== JourneyStatus.OPEN) {
      throw new BadRequestException('This journey is no longer open for bidding.');
    }

    if (journey.passenger_id === driverId) {
      throw new ForbiddenException('You cannot bid on your own journey request.');
    }

    // Optional: Check if the driver has already placed a bid and handle it (e.g., allow update or throw error)
    const existingBid = await this.bidRepository.findOne({ where: { journey_id: journeyId, driver_id: driverId } });
    if (existingBid) {
        throw new BadRequestException('You have already placed a bid on this journey.');
    }

    try {
      const bid = this.bidRepository.create({
        journey_id: journeyId,
        driver_id: driverId,
        amount,
        message,
        status: BidStatus.PENDING,
      });

      const savedBid = await this.bidRepository.save(bid);

      // Emit an event to notify the passenger of a new bid
      this.eventEmitter.emit('bid_placed', {
        journeyId,
        passengerId: journey.passenger_id,
        bidId: savedBid.id,
        bidAmount: savedBid.amount,
        driverId,
      });

      this.logger.log(`Driver ${driverId} placed a bid of ${amount} on journey ${journeyId}`);
      return savedBid;
    } catch (error) {
      this.logger.error(`Failed to create bid for driver ${driverId} on journey ${journeyId}`, error.stack);
      throw new InternalServerErrorException('A server error occurred while placing the bid.');
    }
  }

  /**
   * Retrieves all bids for a specific journey. Only the passenger who posted the journey can view the bids.
   * @param journeyId - The ID of the journey.
   * @param passengerId - The ID of the user requesting the bids.
   * @returns An array of bids for the journey, including driver information.
   */
  async getBidsForJourney(journeyId: string, passengerId: string): Promise<Bid[]> {
    const journey = await this.journeyRepository.findOneBy({ id: journeyId });

    if (!journey) {
      throw new NotFoundException(`Journey with ID "${journeyId}" not found.`);
    }

    if (journey.passenger_id !== passengerId) {
      throw new ForbiddenException('You are not authorized to view bids for this journey.');
    }

    return this.bidRepository.find({
      where: { journey_id: journeyId },
      relations: ['driver'], // Assuming a 'driver' relation exists on the Bid entity to join with User/Profile
      order: { amount: 'ASC' }, // Show the lowest bids first
    });
  }

  /**
   * Retrieves all bids placed by a specific driver.
   * @param driverId - The ID of the driver.
   * @returns An array of bids placed by the driver.
   */
  async getBidsByDriver(driverId: string): Promise<Bid[]> {
    return this.bidRepository.find({
      where: { driver_id: driverId },
      relations: ['journey'], // Include journey details for context
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Allows a passenger to accept a driver's bid.
   * This action is transactional: it updates the journey, accepts one bid, and rejects others.
   * @param bidId - The ID of the bid to accept.
   * @param passengerId - The ID of the passenger accepting the bid.
   * @returns The updated Journey entity.
   */
  async acceptBid(bidId: string, passengerId: string): Promise<Journey> {
    const bidToAccept = await this.bidRepository.findOne({
      where: { id: bidId },
      relations: ['journey'],
    });

    if (!bidToAccept) {
      throw new NotFoundException(`Bid with ID "${bidId}" not found.`);
    }

    const journey = bidToAccept.journey;

    if (!journey) {
        throw new InternalServerErrorException(`Bid ${bidId} is not associated with a valid journey.`);
    }

    if (journey.passenger_id !== passengerId) {
      throw new ForbiddenException('You are not authorized to accept bids for this journey.');
    }

    if (journey.status !== JourneyStatus.OPEN) {
      throw new BadRequestException('This journey is no longer open for bidding.');
    }

    // Use a transaction to ensure atomicity
    return this.bidRepository.manager.transaction(async (transactionalEntityManager) => {
      // 1. Update the journey: set status to CONFIRMED and assign the driver and agreed fare
      journey.status = JourneyStatus.CONFIRMED;
      journey.driver_id = bidToAccept.driver_id;
      journey.agreed_fare = bidToAccept.amount;
      await transactionalEntityManager.save(Journey, journey);

      // 2. Update the accepted bid status
      bidToAccept.status = BidStatus.ACCEPTED;
      await transactionalEntityManager.save(Bid, bidToAccept);

      // 3. Reject all other bids for this journey
      const otherBids = await transactionalEntityManager.find(Bid, {
        where: {
          journey_id: journey.id,
          status: In([BidStatus.PENDING]),
        },
      });

      for (const bid of otherBids) {
        if(bid.id !== bidToAccept.id) {
            bid.status = BidStatus.REJECTED;
            await transactionalEntityManager.save(Bid, bid);
        }
      }

      // 4. Emit an event to be consumed by the ride-service to create the actual ride
      this.eventEmitter.emit('bid_accepted', {
        journeyId: journey.id,
        bidId: bidToAccept.id,
        driverId: journey.driver_id,
        passengerId: journey.passenger_id,
        agreedFare: journey.agreed_fare,
        scheduledAt: journey.scheduled_at,
      });

      this.logger.log(`Passenger ${passengerId} accepted bid ${bidId} for journey ${journey.id}`);
      return journey;
    });
  }
}
