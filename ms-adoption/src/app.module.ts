import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdoptionController } from './adoption/adoption.controller';
import { AdoptionService } from './adoption/adoption.service';
import { Adoption } from './adoption/adoption.entity';
import { IdempotencyGuard } from './idempotency/idempotency.guard';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    RedisModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5433,
      username: 'pguser',
      password: 'pgpass',
      database: 'adoption_db',
      entities: [Adoption],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Adoption]),
    ClientsModule.register([
      {
        name: 'ANIMAL_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://guest:guest@localhost:5672'],
          queue: 'animal_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [AppController, AdoptionController],
  providers: [AppService, AdoptionService, IdempotencyGuard],
})
export class AppModule {}
