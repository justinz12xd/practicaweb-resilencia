import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AnimalService } from './animal.service';

@Controller()
export class AnimalConsumer {
  constructor(private readonly animalService: AnimalService) {}

  @EventPattern('adoption.created')
  async handleAdoptionCreated(
    @Payload() data: { animal_id: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      console.log('📥 adoption.created recibido');
      console.log(`   Animal ID: ${data.animal_id}`);
      
      await this.animalService.markAsAdopted(data.animal_id);
      
      // ACK - confirma que el mensaje fue procesado
      channel.ack(originalMsg);
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error.message);
      // ACK de todas formas para no reencolar infinitamente
      // El mensaje se considera "procesado" aunque haya fallado
      channel.ack(originalMsg);
    }
  }
}
