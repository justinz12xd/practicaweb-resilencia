import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import { McpClientService } from '../mcp-client/mcp-client.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly mcpClient: McpClientService
  ) {}

  /**
   * Process natural language query using Gemini + MCP Tools
   */
  async processNaturalLanguageQuery(query: string): Promise<{
    response: string;
    toolsExecuted: string[];
  }> {
    const toolsExecuted: string[] = [];

    try {
      // 1. Get available tools from MCP Server
      this.logger.log('Fetching available tools from MCP Server...');
      const mcpTools = await this.mcpClient.listTools();
      
      if (!mcpTools || mcpTools.length === 0) {
        throw new Error('No tools available from MCP Server');
      }

      this.logger.log(`Found ${mcpTools.length} tools: ${mcpTools.map(t => t.name).join(', ')}`);

      // 2. Convert tools to Gemini format
      const geminiTools = this.mcpClient.convertToolsToGeminiFormat(mcpTools);

      // 3. Create tool executor function
      const toolExecutor = async (toolName: string, args: any) => {
        toolsExecuted.push(toolName);
        this.logger.log(`Executing tool via MCP: ${toolName}`);
        
        const result = await this.mcpClient.callTool(toolName, args);
        
        // Extract text content from MCP result
        if (result.content && Array.isArray(result.content)) {
          const textContent = result.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join('\n');
          return textContent;
        }
        
        return result;
      };

      // 4. Process query with Gemini (with automatic tool execution)
      this.logger.log('Processing query with Gemini AI...');
      const finalResponse = await this.geminiService.processWithToolExecution(
        query,
        geminiTools,
        toolExecutor
      );

      this.logger.log(`Query processed successfully. Tools executed: ${toolsExecuted.join(', ')}`);

      return {
        response: finalResponse,
        toolsExecuted,
      };
    } catch (error: any) {
      this.logger.error('Error processing natural language query:', error);
      throw new Error(
        `Failed to process query: ${error.message}`
      );
    }
  }

  /**
   * Get list of available tools
   */
  async getAvailableTools(): Promise<any[]> {
    try {
      const mcpTools = await this.mcpClient.listTools();
      return mcpTools;
    } catch (error: any) {
      this.logger.error('Error getting available tools:', error);
      throw error;
    }
  }
}
