import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn} from 'typeorm';

@Entity('webhook_events')
export class WebhookEventEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    @Column()
    event_id: string;
    @Column({type: 'text'})
    event_type: string
    @Column({type: 'jsonb'})
    payload: any
    @CreateDateColumn()
    created_at: Date;
}