import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

@Controller('adoptions')
export class AdoptionController {
  constructor(
    @Inject('ADOPTION_PUBLISHER') private readonly adoptionClient: ClientProxy,
  ) {}

  @Post()
  async createAdoption(@Body() body: { animal_id: string; adopter_name: string }) {
    const message_id = uuidv4();

    this.adoptionClient.emit('adoption.request', {
      message_id,
      data: body,
    });

    console.log(`📤 PUBLISHED adoption.request - message_id: ${message_id}`);

    return { message: 'Adoption request sent', message_id };
  }
}
