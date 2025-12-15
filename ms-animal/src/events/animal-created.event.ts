export interface AnimalCreatedPayload {
  animal_id: string;
  name: string;
  species: string;
  available: boolean;
  created_at: string;
}

export class AnimalCreatedEvent {
    event_id: string;
    event_type: 'animal.created';
    timestamp: string;
    idempotency_key: string;
    payload: AnimalCreatedPayload;
}
