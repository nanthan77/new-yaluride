import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Ride } from './ride.entity';

export enum RideLegStatus {
  WAITING = 'WAITING',
  ON_BOARD = 'ON_BOARD',
  DROPPED_OFF = 'DROPPED_OFF',
}

@Entity('ride_passengers')
export class RidePassenger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  rideId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  journeyId: string;

  @Column({ type: 'int', default: 1 })
  seatsBooked: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fareContribution: number;

  @Column({
    type: 'enum',
    enum: RideLegStatus,
    default: RideLegStatus.WAITING,
  })
  status: RideLegStatus;

  @ManyToOne(() => Ride)
  @JoinColumn({ name: 'rideId' })
  ride: Ride;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
