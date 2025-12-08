import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AdoptionController } from './adoption.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ADOPTION_PUBLISHER',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://guest:guest@localhost:5672'],
          queue: 'adoption_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [AdoptionController],
})
export class AdoptionModule {}
