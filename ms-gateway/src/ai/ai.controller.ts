import { Body, Controller, Post, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';

export class ChatRequestDto {
  query: string;
}

export class ChatResponseDto {
  response: string;
  toolsExecuted?: string[];
  timestamp: string;
}

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * POST /ai/chat
   * Natural language interface for animal adoption system
   * 
   * Examples:
   * - "Lista todos los animales disponibles"
   * - "¿Hay algún perro llamado Max?"
   * - "Quiero adoptar el animal con ID abc-123 para María García (maria@example.com)"
   * - "Busca gatos disponibles"
   */
  @Post('chat')
  async chat(@Body() body: ChatRequestDto): Promise<ChatResponseDto> {
    try {
      if (!body.query || body.query.trim() === '') {
        throw new HttpException(
          'Query is required',
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(`Received chat query: "${body.query}"`);

      const result = await this.aiService.processNaturalLanguageQuery(
        body.query
      );

      return {
        response: result.response,
        toolsExecuted: result.toolsExecuted,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error('Error processing chat request:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /ai/tools
   * Get list of available AI tools
   */
  @Post('tools')
  async getTools() {
    try {
      const tools = await this.aiService.getAvailableTools();
      return {
        tools,
        count: tools.length,
      };
    } catch (error: any) {
      this.logger.error('Error getting tools:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
