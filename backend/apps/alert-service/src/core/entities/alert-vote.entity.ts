import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { RoadAlert } from './road-alert.entity';
import { User } from '@yaluride/database';

/**
 * Represents a single vote (upvote or downvote) cast by a user on a road alert.
 * This entity tracks community feedback, which is crucial for determining the
 * confidence score and lifecycle of an alert.
 */
@Entity('alert_votes')
export class AlertVote {
  /**
   * The ID of the alert this vote belongs to. Part of the composite primary key.
   */
  @PrimaryColumn({ type: 'uuid' })
  alert_id: string;

  /**
   * The ID of the user who cast the vote. Part of the composite primary key.
   */
  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  /**
   * The RoadAlert entity this vote is associated with.
   * If an alert is deleted, all its votes are also deleted (CASCADE).
   */
  @ManyToOne(() => RoadAlert, (alert) => alert.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alert_id' })
  alert: RoadAlert;

  /**
   * The User entity who cast this vote.
   * If a user is deleted, all their votes are also deleted (CASCADE).
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * The value of the vote.
   *  1: Represents an upvote, confirmation, or "this is helpful".
   * -1: Represents a downvote, rejection, or "not here anymore".
   * A CHECK constraint in the database ensures this value is either 1 or -1.
   */
  @Column({
    type: 'smallint',
    comment: '1 for upvote/confirm, -1 for downvote/reject',
  })
  vote: number;

  /**
   * The timestamp when the vote was cast.
   */
  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
