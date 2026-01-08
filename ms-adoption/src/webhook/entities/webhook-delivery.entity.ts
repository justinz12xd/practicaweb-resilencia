import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WebhookSubscription } from './webhook-subscription.entity';

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({type: 'uuid'})
  subscription_id: string;

  @ManyToOne(() => WebhookSubscription)
  @JoinColumn({name: 'subscription_id'})
  subscription: WebhookSubscription;

  @Column({ type: 'text' })
  event_id: string;

  @Column({ type: 'integer', default: 1 })
  attempt_number: number;

  @Column({ type: 'text' })
  status: 'pending' | 'delivered' | 'failed';

  @Column({ type: 'integer', nullable: true })
  response_status: number;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'timestamptz', nullable: true })
  delivered_at: Date;

  @CreateDateColumn()
  created_at: Date;
}

