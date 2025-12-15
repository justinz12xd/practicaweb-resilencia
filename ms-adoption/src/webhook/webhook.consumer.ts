import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { WebhookPublisherService } from './webhook.publisher.service';
import type { AdoptionCompletedEvent } from '../events/adoption-completed.event';

/**
 * Consumer que escucha eventos de RabbitMQ y los transforma en webhooks
 * 
 * FLUJO:
 * 1. Escucha evento 'webhook.publish' de RabbitMQ
 * 2. Recibe el evento en formato estándar
 * 3. Llama al WebhookPublisherService
 * 4. Confirma procesamiento (ACK)
 */
@Controller()
export class WebhookConsumer {
  constructor(
    private readonly webhookPublisher: WebhookPublisherService,
  ) {}


  @EventPattern('webhook.publish')
  async handleWebhookPublish(
    @Payload() event: AdoptionCompletedEvent,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const msg = context.getMessage();

    console.log('📥 Evento recibido para webhook:', {
      event_id: event.event_id,
      event_type: event.event_type,
    });

    try {
      await this.webhookPublisher.publishEvent(event);

      channel.ack(msg);
      
      console.log('✅ Webhook procesado correctamente');

    } catch (error) {
      console.error('❌ Error procesando webhook:', error.message);

      channel.ack(msg);
    }
  }
}