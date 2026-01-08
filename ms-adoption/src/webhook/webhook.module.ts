import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { WebhookPublisherService } from './webhook.publisher.service';
import { WebhookConsumer } from './webhook.consumer';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookEventEntity } from './entities/webhook-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WebhookSubscription,
      WebhookDelivery,
      WebhookEventEntity,
    ]),

    ClientsModule.register([
      {
        name: 'WEBHOOK_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://guest:guest@localhost:5672'],
          queue: 'webhook_dlq',  // Dead Letter Queue
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [
    WebhookConsumer,  // Necesario para que @EventPattern funcione
  ],
  providers: [
    WebhookPublisherService,
  ],
  exports: [
    WebhookPublisherService,  
  ],
})
export class WebhookModule {}