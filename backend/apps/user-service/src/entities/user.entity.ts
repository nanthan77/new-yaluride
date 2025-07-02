import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { UserRole } from '@yaluride/common';

@Entity('users')
@Index(['phone_number'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone_number: string;

  @Column()
  password_hash: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PASSENGER,
  })
  role: UserRole;

  @Column({ nullable: true })
  profile_picture_url?: string;

  @Column({ default: 'en' })
  language: string;

  @Column({ default: true })
  phone_verified: boolean;

  @Column({ default: false })
  email_verified: boolean;

  @Column({ default: false })
  gn_verified: boolean;

  @Column({ nullable: true })
  gn_division_id?: string;

  @Column({ default: 'pending' })
  gn_verified_status: string;

  @Column('simple-array', { nullable: true })
  gn_verification_documents?: string[];

  @Column({ default: false })
  identity_verified: boolean;

  @Column({ default: false })
  has_completed_onboarding: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
