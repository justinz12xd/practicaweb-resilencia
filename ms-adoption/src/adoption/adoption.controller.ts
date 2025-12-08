import { Controller, Inject, Post, Body } from '@nestjs/common';
import {
  EventPattern,
  Payload,
  Ctx,
  RmqContext,
  ClientProxy,
} from '@nestjs/microservices';
import { IdempotencyGuard } from '../idempotency/idempotency.guard';
import { AdoptionService } from './adoption.service';

@Controller('adoptions')
export class AdoptionController {
  constructor(
    private readonly idempotencyGuard: IdempotencyGuard,
    private readonly adoptionService: AdoptionService,
    @Inject('ANIMAL_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Post()
  async createAdoption(@Body() body: { animal_id: string; adopter_name: string }) {
    const adoption = await this.adoptionService.createAdoption(body);
    this.client.emit('adoption.created', { animal_id: body.animal_id });
    return adoption;
  }

  @EventPattern('adoption.request')
  async handle(@Payload() payload: any, @Ctx() context: RmqContext) {
    console.log('📥 Procesando adoption.request...');
    
    const channel = context.getChannelRef();
    const msg = context.getMessage();

    await this.idempotencyGuard.run(payload.message_id, async () => {
      await this.adoptionService.createAdoption(payload.data);
      this.client.emit('adoption.created', payload.data);
      console.log('✅ Adopción creada y evento emitido a ms-animal');
    });

    channel.ack(msg);
  }
}
