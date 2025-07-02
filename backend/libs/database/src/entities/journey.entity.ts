import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum JourneyStatus {
  PENDING_BIDS = 'pending_bids',
  OPEN = 'open',
  ACTIVE = 'active',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('journeys')
export class Journey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  passenger_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'passenger_id' })
  passenger: User;

  @Column()
  pickup_location: string;

  @Column()
  destination: string;

  @Column('decimal', { precision: 10, scale: 8 })
  pickup_latitude: number;

  @Column('decimal', { precision: 11, scale: 8 })
  pickup_longitude: number;

  @Column('decimal', { precision: 10, scale: 8 })
  destination_latitude: number;

  @Column('decimal', { precision: 11, scale: 8 })
  destination_longitude: number;

  @Column({
    type: 'enum',
    enum: JourneyStatus,
    default: JourneyStatus.OPEN,
  })
  status: JourneyStatus;

  @Column({ nullable: true })
  driver_id: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  estimated_fare: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  agreed_fare: number;

  @Column({ type: 'datetime', nullable: true })
  scheduled_time: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
