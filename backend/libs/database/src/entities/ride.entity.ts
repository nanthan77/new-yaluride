import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RideStatus, PaymentStatus } from '../../../common/src/enums/ride.enums';
import { User } from './user.entity';

@Entity('rides')
export class Ride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  passengerId: string;

  @Column()
  driverId: string;

  @Column()
  pickupLocation: string;

  @Column()
  dropoffLocation: string;

  @Column('decimal', { precision: 10, scale: 2 })
  fare: number;

  @Column({
    type: 'enum',
    enum: RideStatus,
    default: RideStatus.SCHEDULED,
  })
  status: RideStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'int', nullable: true })
  passengerRating: number;

  @Column({ type: 'int', nullable: true })
  driverRating: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'passengerId' })
  passenger: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'driverId' })
  driver: User;
}
