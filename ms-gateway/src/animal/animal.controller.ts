import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

@Controller('animals')
export class AnimalController {
  constructor(
    @Inject('ANIMAL_PUBLISHER') private readonly animalClient: ClientProxy,
  ) {}

  @Post()
  async createAnimal(@Body() body: { name: string; species: string }) {
    const message_id = uuidv4();

    this.animalClient.emit('animal.create', {
      message_id,
      data: body,
    });

    console.log(`🐾 PUBLISHED animal.create - message_id: ${message_id}`);

    return { message: 'Animal creation request sent', message_id };
  }
}
