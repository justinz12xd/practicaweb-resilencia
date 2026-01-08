import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { WebhookPublisherService } from './webhook.publisher.service';
import type { AdoptionCompletedEvent } from '../events/adoption-completed.event';


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