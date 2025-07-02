import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  iconUrl: string;

  @Column('int', { default: 0 })
  pointsReward: number;

  @Column('json', { nullable: true })
  criteria: any;

  @CreateDateColumn()
  createdAt: Date;
}
