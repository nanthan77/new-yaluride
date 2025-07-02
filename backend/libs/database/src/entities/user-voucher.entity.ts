import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserVoucherStatus } from '@yaluride/common';
import { User } from './user.entity';
import { Voucher } from './voucher.entity';

@Entity('user_vouchers')
export class UserVoucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  voucherId: string;

  @Column({
    type: 'enum',
    enum: UserVoucherStatus,
    default: UserVoucherStatus.AVAILABLE,
  })
  status: UserVoucherStatus;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Voucher)
  @JoinColumn({ name: 'voucherId' })
  voucher: Voucher;
}
