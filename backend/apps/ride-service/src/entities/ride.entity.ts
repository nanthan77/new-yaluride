import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { RideStatus, PaymentStatus } from '../../../../libs/common/src/enums/ride.enums';
import { User } from '../../user/entities/user.entity'; // Placeholder path
import { Driver } from '../../driver/entities/driver.entity'; // Placeholder path
import { Vehicle } from '../../driver/entities/vehicle.entity'; // Placeholder path
import { Journey } from '../../marketplace/entities/journey.entity'; // Placeholder path
import { Bid } from '../../marketplace/entities/bid.entity'; // Placeholder path

// Interface for PostGIS Point object
interface Point {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

@Entity('rides')
export class Ride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  journey_id: string;

  @OneToOne(() => Journey)
  @JoinColumn({ name: 'journey_id' })
  journey: Journey;

  @Column({ type: 'uuid' })
  passenger_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'passenger_id' })
  passenger: User;

  @Column({ type: 'uuid', nullable: true })
  driver_id: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ type: 'uuid', nullable: true })
  vehicle_id: string;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ type: 'uuid', unique: true })
  accepted_bid_id: string;

  @OneToOne(() => Bid)
  @JoinColumn({ name: 'accepted_bid_id' })
  accepted_bid: Bid;

  @Column({
    type: 'enum',
    enum: RideStatus,
    default: RideStatus.SCHEDULED,
  })
  status: RideStatus;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  pickup_location: Point;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  dropoff_location: Point;

  @Column({ type: 'timestamptz' })
  scheduled_pickup_time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  actual_pickup_time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  actual_dropoff_time: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  final_fare: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status: PaymentStatus;

  @Column({ type: 'int', nullable: true, check: 'passenger_rating BETWEEN 1 AND 5' })
  passenger_rating: number;

  @Column({ type: 'int', nullable: true, check: 'driver_rating BETWEEN 1 AND 5' })
  driver_rating: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
