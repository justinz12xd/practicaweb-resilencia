import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class IdempotencyGuard {
  constructor(private readonly redis: RedisService) {}

  async run(messageId: string, handler: () => Promise<any>) {
    const isNew = await this.redis.tryRegister(messageId);

    if (!isNew) {
      console.log(`⚠️ [REDIS IDEMP] Mensaje duplicado ignorado: ${messageId}`);
      return;
    }

    console.log(`✅ [REDIS IDEMP] Procesando mensaje nuevo: ${messageId}`);
    await handler();
  }
}
