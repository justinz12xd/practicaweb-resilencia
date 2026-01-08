import { Controller, Inject, Post, Body } from '@nestjs/common';
import {
  EventPattern,
  Payload,
  Ctx,
  RmqContext,
  ClientProxy,
} from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { IdempotencyGuard } from '../idempotency/idempotency.guard';
import { AdoptionService } from './adoption.service';
import { AdoptionCompletedEvent } from '../events/adoption-completed.event';

@Controller('adoptions')
export class AdoptionController {
  constructor(
    private readonly idempotencyGuard: IdempotencyGuard,
    private readonly adoptionService: AdoptionService,
    @Inject('ANIMAL_PUBLISHER') private readonly animalClient: ClientProxy,
    @Inject('WEBHOOK_PUBLISHER') private readonly webhookClient: ClientProxy,
  ) {}

  @Post()
  async createAdoption(@Body() body: { animal_id: string; adopter_name: string }) {
    const adoption = await this.adoptionService.createAdoption(body);
    this.animalClient.emit('adoption.created', { animal_id: body.animal_id });
    return adoption;
  }

  @EventPattern('adoption.request')
  async handle(@Payload() payload: any, @Ctx() context: RmqContext) {
    console.log('📥 Procesando adoption.request...');
    console.log('   Message ID:', payload.message_id);
    
    const channel = context.getChannelRef();
    const msg = context.getMessage();

    await this.idempotencyGuard.run(payload.message_id, async () => {
      // 1. Crear adopción en BD
      const adoption = await this.adoptionService.createAdoption(payload.data);
      
      console.log('✅ Adopción creada:', adoption.id);

      // 2. Emitir evento a ms-animal (flujo existente)
      this.animalClient.emit('adoption.created', payload.data);

      // 3. Crear y emitir evento webhook
      const webhookEvent: AdoptionCompletedEvent = {
        event_id: uuidv4(),
        event_type: 'adoption.completed',
        timestamp: new Date().toISOString(),
        idempotency_key: payload.message_id,
        payload: {
          adoption_id: adoption.id,
          animal_id: adoption.animal_id,
          adopter_name: adoption.adopter_name,
          adopted_at: adoption.created_at.toISOString(),
        },
      };

      this.webhookClient.emit('webhook.publish', webhookEvent);
      
      console.log('📤 Evento webhook emitido:', webhookEvent.event_id);
    });

    channel.ack(msg);
  }
}
