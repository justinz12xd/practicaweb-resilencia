import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { v4 as uuidv4 } from 'uuid';

@Controller('adoptions')
export class AdoptionController {
  constructor(@Inject('ADOPTION_PUBLISHER') private client: ClientProxy) {}

  @Post()
  async requestAdoption(@Body() body: any) {
    const message = {
      message_id: uuidv4(),
      event: 'adoption.request',
      data: body,
      timestamp: new Date().toISOString()
    };

    this.client.emit('adoption.request', message);
    return { status: 'PUBLISHED', message_id: message.message_id };
  }
}