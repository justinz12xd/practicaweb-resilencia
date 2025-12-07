import { Injectable } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyGuard {
  constructor(private readonly idemp: IdempotencyService) {}

  async run(messageId: string, handler: () => Promise<any>) {
    const canProcess = await this.idemp.tryRegister(messageId);

    if (!canProcess) {
      console.log(`[IDEMP] Mensaje duplicado ignorado: ${messageId}`);
      return;
    }

    await handler();
  }
}
