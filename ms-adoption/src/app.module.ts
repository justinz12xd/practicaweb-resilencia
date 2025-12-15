import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdoptionService } from './adoption/adoption.service';
import { AdoptionController } from './adoption/adoption.controller';
import { Adoption } from './adoption/adoption.entity';
import { IdempotencyGuard } from './idempotency/idempotency.guard';
import { RedisService } from './redis/redis.service';
import { WebhookModule } from './webhook/webhook.module';  
import { WebhookSubscription } from './webhook/entities/webhook-subscription.entity';  
import { WebhookDelivery } from './webhook/entities/webhook-delivery.entity';  
import { WebhookEventEntity } from './webhook/entities/webhook-event.entity';  

@Module({
  imports: [
    // Cargar variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5433,
      username: 'pguser',
      password: 'pgpass',
      database: 'adoption_db',
      entities: [
        Adoption,
        WebhookSubscription,   
        WebhookDelivery,       
        WebhookEventEntity,    
      ],
      synchronize: false, 
      logging: true,
    }),

    // Entidades para repositorios
    TypeOrmModule.forFeature([Adoption]),

    // Clientes RabbitMQ
    ClientsModule.register([
      {
        name: 'ANIMAL_PUBLISHER',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://guest:guest@localhost:5672'],
          queue: 'animal_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'WEBHOOK_PUBLISHER',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://guest:guest@localhost:5672'],
          queue: 'webhook_queue',
          queueOptions: { durable: true },
        },
      },
    ]),

    // 👇 NUEVO: Módulo de webhooks
    WebhookModule,
  ],
  controllers: [AppController, AdoptionController],
  providers: [
    AppService,
    AdoptionService,
    IdempotencyGuard,
    RedisService,
  ],
})
export class AppModule {}