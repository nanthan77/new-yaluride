import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('journeys')
export class Journey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  startLocation: string;

  @Column()
  endLocation: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  origin_lng: number;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  origin_lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  destination_lng: number;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  destination_lat: number;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'timestamp' })
  departure_time: Date;

  @Column({ default: 'PLANNED' })
  status: string;

  @Column({ default: false })
  is_women_only: boolean;

  @Column({ default: false })
  is_shared_ride_accepted: boolean;

  @Column({ nullable: true })
  preferred_vehicle_type: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
