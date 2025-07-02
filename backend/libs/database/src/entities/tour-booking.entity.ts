import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { TourPackage } from './tour-package.entity';

@Entity('tour_bookings')
export class TourBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  tourPackageId: string;

  @Column({ type: 'timestamp' })
  bookingDate: Date;

  @Column()
  numberOfPeople: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => TourPackage)
  @JoinColumn({ name: 'tourPackageId' })
  tourPackage: TourPackage;
}
