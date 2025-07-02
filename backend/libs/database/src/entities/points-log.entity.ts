import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum PointReason {
  RIDE_COMPLETED = 'ride_completed',
  REFERRAL_BONUS = 'referral_bonus',
  FIRST_RIDE = 'first_ride',
  RATING_BONUS = 'rating_bonus',
}

@Entity('points_log')
export class PointsLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  points: number;

  @Column({
    type: 'enum',
    enum: PointReason,
  })
  reason: PointReason;

  @Column('text', { nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
