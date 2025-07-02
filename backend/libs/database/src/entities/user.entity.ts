import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole, ModerationStatus } from '../../../common/src/enums/user.enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PASSENGER,
  })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  phoneVerified: boolean;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ default: false })
  gnVerified: boolean;

  @Column({ default: false })
  identityVerified: boolean;

  @Column({ default: false })
  hasCompletedOnboarding: boolean;

  @Column({ nullable: true })
  gnDivisionId: string;

  @Column({ nullable: true })
  gnVerifiedStatus: string;

  @Column('text', { array: true, nullable: true })
  gnVerificationDocuments: string[];

  @Column({ nullable: true })
  profilePictureUrl: string;

  @Column({ default: 'en' })
  language: string;

  @Column({
    type: 'enum',
    enum: ModerationStatus,
    default: ModerationStatus.PENDING,
  })
  moderationStatus: ModerationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
