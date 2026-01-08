import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiModule } from '../gemini/gemini.module';
import { McpClientModule } from '../mcp-client/mcp-client.module';

@Module({
  imports: [
    ConfigModule,
    GeminiModule,
    McpClientModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
