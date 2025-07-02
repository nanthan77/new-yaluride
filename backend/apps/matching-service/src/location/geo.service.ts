import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '@yaluride/database';
import { VehicleType } from '@yaluride/common';

// --- Interfaces & Types ---

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Point {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * GeoService is responsible for all geospatial operations within the matching service.
 * This includes finding nearby drivers, calculating distances, and interacting with
 * external mapping APIs for tasks like snapping coordinates to roads.
 */
@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
  ) {}

  /**
   * Finds available drivers within a specified radius of a given point using PostGIS.
   * This is a highly optimized query that leverages spatial indexes.
   *
   * @param center The geographic center point to search from.
   * @param radiusKm The search radius in kilometers.
   * @param vehicleType Optional vehicle type to filter by.
   * @returns A promise that resolves to an array of drivers found, ordered by distance.
   */
  async findAvailableDriversInRadius(
    center: Coordinates,
    radiusKm: number,
    vehicleType?: VehicleType,
  ): Promise<(Driver & { distance_meters: number })[]> {
    const radiusMeters = radiusKm * 1000;
    const originPoint = `ST_SetSRID(ST_MakePoint(${center.longitude}, ${center.latitude}), 4326)::geography`;

    this.logger.debug(
      `Searching for available drivers of type '${vehicleType || 'any'}' within ${radiusKm}km of ${center.latitude},${center.longitude}`,
    );

    const queryBuilder = this.driverRepository
      .createQueryBuilder('driver')
      // Select all driver columns and calculate the distance from the origin point
      .select('driver.*')
      .addSelect(`ST_Distance(driver.current_location, ${originPoint})`, 'distance_meters')
      // Join with the user table to access role information if needed (optional here)
      .leftJoinAndSelect('driver.user', 'user')
      // Join with vehicles table if filtering by vehicle type
      .leftJoinAndSelect('driver.vehicles', 'vehicle', 'vehicle.is_primary = TRUE');

    // The core geospatial query using ST_DWithin for performance
    // It uses the spatial index on the 'current_location' column.
    queryBuilder.where(`ST_DWithin(driver.current_location, ${originPoint}, :radius)`, {
      radius: radiusMeters,
    });

    // Add additional filters
    queryBuilder.andWhere('driver.is_available = :isAvailable', { isAvailable: true });

    if (vehicleType) {
      queryBuilder.andWhere('vehicle.vehicle_type = :vehicleType', { vehicleType });
    }

    // Order the results by distance to get the closest drivers first
    queryBuilder.orderBy('distance_meters', 'ASC');

    try {
      const drivers = await queryBuilder.getRawMany<Driver & { distance_meters: number }>();
      this.logger.log(`Found ${drivers.length} drivers within the radius.`);
      return drivers;
    } catch (error) {
      this.logger.error('Error executing findAvailableDriversInRadius query:', error.stack);
      throw new Error('Failed to query for nearby drivers.');
    }
  }

  /**
   * Snaps a given coordinate pair to the nearest road.
   * In a real-world application, this would call an external API like Google Maps Roads API.
   *
   * @param coords The coordinates to snap.
   * @returns A promise that resolves to the snapped coordinates.
   */
  async snapToRoad(coords: Coordinates): Promise<Coordinates> {
    this.logger.debug(`[Placeholder] Snapping coordinates to road: ${coords.latitude}, ${coords.longitude}`);
    // In a real implementation:
    // const response = await this.httpService.get(`https://roads.googleapis.com/v1/snapToRoads?path=${coords.latitude},${coords.longitude}&key=...`).toPromise();
    // return { latitude: response.data.snappedPoints[0].location.latitude, longitude: response.data.snappedPoints[0].location.longitude };
    return coords; // Returning original coordinates as a placeholder
  }

  /**
   * Calculates the great-circle distance between two points on the Earth
   * using the Haversine formula.
   *
   * @param coord1 The first coordinate pair.
   * @param coord2 The second coordinate pair.
   * @returns The distance in kilometers.
   */
  haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(coord2.latitude - coord1.latitude);
    const dLon = this.toRad(coord2.longitude - coord1.longitude);
    const lat1Rad = this.toRad(coord1.latitude);
    const lat2Rad = this.toRad(coord2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Converts degrees to radians.
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
