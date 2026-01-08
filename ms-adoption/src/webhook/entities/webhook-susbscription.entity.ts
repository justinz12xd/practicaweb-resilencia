import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class WebhookSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({type: 'text'})
  url: string;

  @Column({type: 'text'})
  event_type: string;

  @Column({ type:'text' })
    secret: string;

    @Column({ type: 'boolean', default: true })
    active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}