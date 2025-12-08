import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AnimalService } from './animal.service';

@Controller()
export class AnimalConsumer {
  constructor(private readonly animalService: AnimalService) {}

  // Listener para CREAR animales (desde ms-gateway)
  @EventPattern('animal.create')
  async handleAnimalCreate(
    @Payload() payload: { message_id: string; data: { name: string; species: string } },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      console.log('📥 animal.create recibido');
      console.log(`   Message ID: ${payload.message_id}`);
      console.log(`   Nombre: ${payload.data.name}, Especie: ${payload.data.species}`);
      
      // Crear con verificación de idempotencia
      const result = await this.animalService.create(payload.data);
      
      if (result.isNew) {
        console.log(`✅ Animal CREADO: ${result.animal.id}`);
      } else {
        console.log(`⚠️ Animal YA EXISTÍA: ${result.animal.id} (idempotencia aplicada)`);
      }
      
      channel.ack(originalMsg);
    } catch (error) {
      console.error('❌ Error creando animal:', error.message);
      channel.ack(originalMsg);
    }
  }

  // Listener para ADOPTAR animales (desde ms-adoption)
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
      
      const wasAdopted = await this.animalService.markAsAdopted(data.animal_id);
      
      if (wasAdopted) {
        console.log('✅ Animal adoptado exitosamente');
      } else {
        console.log('⚠️ Animal ya estaba adoptado (idempotencia aplicada)');
      }
      
      channel.ack(originalMsg);
    } catch (error) {
      console.error('❌ Error procesando adopción:', error.message);
      channel.ack(originalMsg);
    }
  }
}
