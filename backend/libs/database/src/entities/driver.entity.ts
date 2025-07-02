import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { DriverStatus } from '../../../common/src/enums/vehicle.enums';
import { User } from './user.entity';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  user_id: string;

  @Column()
  licenseNumber: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  avg_rating: number;

  @Column({ default: 0 })
  totalRides: number;

  @Column({
    type: 'enum',
    enum: DriverStatus,
    default: DriverStatus.OFFLINE,
  })
  status: DriverStatus;

  @Column({ default: false })
  is_available: boolean;

  @Column({ nullable: true })
  vehicle_type: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  current_location: any;

  @Column({ default: false })
  accepts_women_only_rides: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
