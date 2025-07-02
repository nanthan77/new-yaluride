import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, Journey } from '@yaluride/database';
import { VehicleType } from '@yaluride/common';

export interface FindDriversDto {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  vehicleType: VehicleType;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(Journey)
    private readonly journeyRepository: Repository<Journey>,
  ) {}

  async findAvailableDrivers(findDriversDto: FindDriversDto): Promise<any[]> {
    const { latitude, longitude, radiusKm = 5, vehicleType } = findDriversDto;
    
    this.logger.log(`Finding drivers near (${latitude}, ${longitude}) within ${radiusKm}km for vehicle type: ${vehicleType}`);

    const radiusMeters = radiusKm * 1000;
    const originPoint = `POINT(${longitude} ${latitude})`;

    const queryBuilder = this.driverRepository.createQueryBuilder('driver');

    queryBuilder
      .select([
        'driver.id',
        'driver.user_id',
        'driver.avg_rating',
        'driver.vehicle_type',
      ])
      .addSelect(
        `ST_Distance(driver.current_location, ST_GeomFromText(:origin, 4326))`,
        'distance',
      )
      .leftJoin('driver.user', 'user')
      .where('driver.is_available = :isAvailable', { isAvailable: true })
      .andWhere(
        `ST_DWithin(driver.current_location, ST_GeomFromText(:origin, 4326), :radius)`,
        {
          origin: originPoint,
          radius: radiusMeters,
        },
      )
      .orderBy('distance', 'ASC');

    if (vehicleType) {
      queryBuilder.andWhere('driver.vehicle_type = :vehicleType', { vehicleType });
    }

    const drivers = await queryBuilder.getRawAndEntities();

    return drivers.entities.map((driver, index) => ({
      id: driver.id,
      name: `Driver ${driver.user_id}`,
      avgRating: driver.avg_rating || 0,
      vehicle: { type: driver.vehicle_type },
      location: { latitude, longitude },
      distanceKm: drivers.raw[index].distance / 1000,
    }));
  }
}
