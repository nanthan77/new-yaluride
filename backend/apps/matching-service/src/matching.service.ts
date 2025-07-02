import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Journey, Driver, User } from '@yaluride/database';
import { VehicleTypeEnum } from '@yaluride/common';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(Journey)
    private readonly journeyRepository: Repository<Journey>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAvailableDrivers(
    latitude: number,
    longitude: number,
    vehicleType?: VehicleTypeEnum,
    radiusKm: number = 10,
  ): Promise<Driver[]> {
    this.logger.log(`Finding available drivers near ${latitude}, ${longitude} within ${radiusKm}km`);

    const queryBuilder = this.driverRepository.createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .where('driver.status = :status', { status: 'online' })
      .andWhere(
        `ST_DWithin(
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(user.longitude, user.latitude), 4326)::geography,
          :radius
        )`,
        {
          latitude,
          longitude,
          radius: radiusKm * 1000, // Convert km to meters
        }
      )
      .orderBy('driver.rating', 'DESC')
      .limit(20);

    if (vehicleType) {
      this.logger.log(`Filtering by vehicle type: ${vehicleType}`);
    }

    const drivers = await queryBuilder.getMany();
    this.logger.log(`Found ${drivers.length} available drivers`);
    
    return drivers;
  }

  async createMatchRequest(
    passengerId: string,
    pickupLatitude: number,
    pickupLongitude: number,
    destinationLatitude: number,
    destinationLongitude: number,
    vehicleType?: VehicleTypeEnum,
  ): Promise<Journey> {
    this.logger.log(`Creating match request for passenger ${passengerId}`);

    const journey = this.journeyRepository.create({
      passenger_id: passengerId,
      pickup_location: `${pickupLatitude},${pickupLongitude}`,
      destination: `${destinationLatitude},${destinationLongitude}`,
      pickup_latitude: pickupLatitude,
      pickup_longitude: pickupLongitude,
      destination_latitude: destinationLatitude,
      destination_longitude: destinationLongitude,
      status: 'open' as any,
    });

    const savedJourney = await this.journeyRepository.save(journey);
    this.logger.log(`Created journey ${savedJourney.id}`);
    
    return savedJourney;
  }

  async getMatchStatus(journeyId: string): Promise<Journey> {
    const journey = await this.journeyRepository.findOne({
      where: { id: journeyId },
      relations: ['passenger'],
    });

    if (!journey) {
      throw new NotFoundException(`Journey ${journeyId} not found`);
    }

    return journey;
  }
}
