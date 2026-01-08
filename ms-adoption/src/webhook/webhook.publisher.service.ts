import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';
import { WebhookEvent } from '../events/webhook-event.interface';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookEventEntity } from './entities/webhook-event.entity';

/**
 * Servicio que maneja la publicación de webhooks
 * 
 * RESPONSABILIDADES:
 * 1. Guardar el evento en la BD
 * 2. Buscar suscriptores activos
 * 3. Enviar webhook a cada suscriptor
 * 4. Manejar reintentos con backoff exponencial
 * 5. Enviar a DLQ si falla después de 6 intentos
 */
@Injectable()
export class WebhookPublisherService {
  constructor(
    // Repositorio para buscar suscripciones
    @InjectRepository(WebhookSubscription)
    private subscriptionRepo: Repository<WebhookSubscription>,
    
    // Repositorio para registrar entregas
    @InjectRepository(WebhookDelivery)
    private deliveryRepo: Repository<WebhookDelivery>,
    
    // Repositorio para guardar eventos
    @InjectRepository(WebhookEventEntity)
    private eventRepo: Repository<WebhookEventEntity>,
    
    // Cliente de RabbitMQ para enviar a DLQ
    @Inject('WEBHOOK_CLIENT')
    private rabbitClient: ClientProxy,
    
    // ConfigService para leer variables de entorno
    private configService: ConfigService,
  ) {}


  async publishEvent(event: WebhookEvent): Promise<void> {
    console.log('📤 Publicando webhook:', {
      event_id: event.event_id,
      event_type: event.event_type,
    });

    await this.saveEvent(event);

    const subscriptions = await this.subscriptionRepo.find({
      where: {
        event_type: event.event_type,
        active: true,
      },
    });

    console.log(`📋 ${subscriptions.length} suscriptores encontrados`);

    for (const subscription of subscriptions) {
      await this.sendWebhook(subscription, event, 1);
    }
  }

  private async saveEvent(event: WebhookEvent): Promise<void> {
    await this.eventRepo.save({
      event_id: event.event_id,
      event_type: event.event_type,
      payload: event.payload,
    });
  }

  private async sendWebhook(
    subscription: WebhookSubscription,
    event: WebhookEvent,
    attempt: number,
  ): Promise<void> {
    console.log(`🔄 Intento ${attempt}/6 para suscripción ${subscription.id}`);

    const delivery = new WebhookDelivery();
    delivery.subscription_id = subscription.id;
    delivery.event_id = event.event_id;
    delivery.attempt_number = attempt;
    delivery.status = 'pending';
    await this.deliveryRepo.save(delivery);

    try {
      // 2. Generar firma HMAC-SHA256
      const signature = this.generateSignature(event, subscription.secret);

      const anonKey = this.configService.get('SUPABASE_ANON_KEY');
      console.log('🔑 Anon Key:', anonKey ? `${anonKey.substring(0, 20)}...` : 'UNDEFINED');

      // 3. Enviar POST HTTP con headers de seguridad
      const response = await axios.post(subscription.url, event, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'X-Signature': signature,           // Firma HMAC
          'X-Timestamp': event.timestamp,     // Timestamp del evento
          'X-Event-Id': event.event_id,       // ID del evento
        },
        timeout: 5000, // 5 segundos máximo
      });

      // 4. Actualizar como exitoso
      delivery.status = 'delivered';
      delivery.response_status = response.status;
      delivery.delivered_at = new Date();
      await this.deliveryRepo.save(delivery);

      console.log(`✅ Webhook entregado exitosamente`);

    } catch (error) {
      // 5. Manejar error
      console.error(`❌ Error enviando webhook:`, error.message);

      delivery.status = 'failed';
      delivery.error_message = error.message;
      await this.deliveryRepo.save(delivery);

      // 6. Decidir si reintentar o enviar a DLQ
      if (attempt < 6) {
                const delay = Math.pow(2, attempt) * 1000;
        
        console.log(`⏳ Reintentando en ${delay / 1000}s...`);

        setTimeout(() => {
          this.sendWebhook(subscription, event, attempt + 1);
        }, delay);

      } else {
        console.log(`☠️ Máximo de reintentos alcanzado, enviando a DLQ`);
        await this.sendToDLQ(event, subscription, error.message);
      }
    }
  }

  private generateSignature(event: WebhookEvent, secret: string): string {
    const payload = JSON.stringify(event);
    
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Envía evento a Dead Letter Queue
   * Permite análisis posterior y reenvío manual
   */
  private async sendToDLQ(
    event: WebhookEvent,
    subscription: WebhookSubscription,
    errorMessage: string,
  ): Promise<void> {
    this.rabbitClient.emit('webhook.dlq', {
      event,
      subscription_id: subscription.id,
      subscription_url: subscription.url,
      reason: 'max_retries_exceeded',
      last_error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}