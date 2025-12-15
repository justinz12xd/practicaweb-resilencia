export interface AdoptionCompletedPayload{
    adoption_id: string;
    animal_id: string;
    adopter_name: string;
    adopted_at: string;  
}

export interface AdoptionCompletedEvent{
    event_id:string;
    event_type: 'adoption.completed';
    timestamp: string;
    idempotency_key: string;
    payload: AdoptionCompletedPayload;
}