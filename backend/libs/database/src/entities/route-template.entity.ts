import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('route_templates')
export class RouteTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json' })
  waypoints: any[];

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  startLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  startLongitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  endLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  endLongitude: number;

  @Column({ type: 'int', default: 0 })
  estimatedDurationMinutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimatedDistanceKm: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
