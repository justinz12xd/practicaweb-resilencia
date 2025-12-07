import { Controller, Get, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AppService } from './app.service';
import { v4 as uuidv4 } from 'uuid';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('ADOPTION_PUBLISHER') private readonly client: ClientProxy,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('adoptions')
  async createAdoption(@Body() body: { animal_id: string; adopter_name: string }) {
    const message_id = uuidv4();
    
    this.client.emit('adoption.request', {
      message_id,
      data: body,
    });

    console.log(`📤 PUBLISHED message_id: ${message_id}`);
    
    return { message: 'Adoption request sent', message_id };
  }
}
