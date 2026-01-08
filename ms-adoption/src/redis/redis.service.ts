import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;
  private readonly TTL_SECONDS = 86400; // 24 horas

  constructor() {
    this.client = new Redis({
      host: 'localhost',
      port: 6379,
    });

    this.client.on('connect', () => {
      console.log('🔴 Redis conectado');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });
  }

  /**
   * Intenta registrar un message_id en Redis.
   * Usa SETNX (SET if Not eXists) para atomicidad.
   * @returns true si es nuevo, false si ya existía
   */
  async tryRegister(messageId: string): Promise<boolean> {
    const key = `idempotency:${messageId}`;
    
    // SETNX + EXPIRE en una sola operación atómica
    const result = await this.client.set(key, 'processed', 'EX', this.TTL_SECONDS, 'NX');
    
    if (result === 'OK') {
      console.log(`🔴 Redis: Nuevo message_id registrado → ${messageId}`);
      return true;
    } else {
      console.log(`🔴 Redis: message_id YA EXISTE → ${messageId}`);
      return false;
    }
  }

  async exists(messageId: string): Promise<boolean> {
    const key = `idempotency:${messageId}`;
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
