import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * JSON-RPC 2.0 Types
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}

/**
 * MCP Client Service
 * Communicates with MCP Server via JSON-RPC 2.0
 */
@Injectable()
export class McpClientService {
  private readonly logger = new Logger(McpClientService.name);
  private httpClient: AxiosInstance;
  private requestIdCounter = 1;

  constructor(private configService: ConfigService) {
    const mcpServerUrl = this.configService.get<string>(
      'MCP_SERVER_URL',
      'http://localhost:3003'
    );

    this.httpClient = axios.create({
      baseURL: mcpServerUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`MCP Client initialized (server: ${mcpServerUrl})`);
  }

  /**
   * Send JSON-RPC request to MCP Server
   */
  private async sendJsonRpcRequest(
    method: string,
    params?: any
  ): Promise<any> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.requestIdCounter++,
    };

    try {
      this.logger.debug(`Sending JSON-RPC request: ${JSON.stringify(request)}`);

      const response = await this.httpClient.post<JsonRpcResponse>(
        '/',
        request
      );

      if (response.data.error) {
        throw new Error(
          `MCP Server error: ${response.data.error.message} (code: ${response.data.error.code})`
        );
      }

      return response.data.result;
    } catch (error: any) {
      if (error.response?.data?.error) {
        const rpcError = error.response.data.error;
        throw new Error(
          `MCP Server error: ${rpcError.message} (code: ${rpcError.code})`
        );
      }
      this.logger.error('Error calling MCP Server:', error.message);
      throw error;
    }
  }

  /**
   * List all available tools from MCP Server
   */
  async listTools(): Promise<any[]> {
    try {
      const result = await this.sendJsonRpcRequest('tools/list');
      this.logger.log(`Received ${result.tools?.length || 0} tools from MCP Server`);
      return result.tools || [];
    } catch (error) {
      this.logger.error('Error listing tools:', error);
      throw error;
    }
  }

  /**
   * Call a specific tool on MCP Server
   */
  async callTool(toolName: string, args: any): Promise<any> {
    try {
      this.logger.log(`Calling tool: ${toolName}`);
      this.logger.debug(`Tool arguments: ${JSON.stringify(args)}`);

      const result = await this.sendJsonRpcRequest('tools/call', {
        name: toolName,
        arguments: args,
      });

      this.logger.log(`Tool ${toolName} executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Initialize connection with MCP Server
   */
  async initialize(): Promise<any> {
    try {
      const result = await this.sendJsonRpcRequest('initialize');
      this.logger.log('MCP Server initialized');
      return result;
    } catch (error) {
      this.logger.error('Error initializing MCP Server:', error);
      throw error;
    }
  }

  /**
   * Convert MCP tool definitions to Gemini function declarations
   */
  convertToolsToGeminiFormat(mcpTools: any[]): any[] {
    return mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));
  }
}
