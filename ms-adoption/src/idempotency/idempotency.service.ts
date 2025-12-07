import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Idempotency } from './idempotency.entity';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(Idempotency)
    private repo: Repository<Idempotency>,
  ) {}

  async tryRegister(messageId: string): Promise<boolean> {
    try {
      await this.repo.insert({
        message_id: messageId,
        consumer: 'ms-adoption'
      });
      return true;
    } catch (err) {
      return false; // Duplicate entry
    }
  }
}
