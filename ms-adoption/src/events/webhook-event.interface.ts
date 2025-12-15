export interface WebhookEvent{
    event_id: string;
    event_type: string;
    timestamp: string;
    idempotency_key: string;
    payload: any;
}