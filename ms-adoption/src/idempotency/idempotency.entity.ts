import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('idempotency')
export class Idempotency {
  @PrimaryColumn('uuid')
  message_id: string;

  @Column()
  consumer: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  processed_at: Date;
}
