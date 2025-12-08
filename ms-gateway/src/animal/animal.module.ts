import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AnimalController } from './animal.controller';

@Module({
  imports: [
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
    ]),
  ],
  controllers: [AnimalController],
})
export class AnimalModule {}
