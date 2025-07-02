import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Ride } from './ride.entity';

@Entity('ride_passengers')
export class RidePassenger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  rideId: string;

  @ManyToOne(() => Ride)
  @JoinColumn({ name: 'ride_id' })
  ride: Ride;

  @Column()
  passengerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'passenger_id' })
  passenger: User;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  pickupTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  dropoffTime: Date;
}
