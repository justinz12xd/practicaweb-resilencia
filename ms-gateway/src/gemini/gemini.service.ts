import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  FunctionDeclaration,
  FunctionCall,
} from '@google/generative-ai';

interface FunctionResult {
  name: string;
  response: any;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY not found in environment variables. Please configure it in .env'
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    this.logger.log('Gemini AI service initialized');
  }

  /**
   * Process natural language query with function calling
   */
  async processQuery(
    userQuery: string,
    availableTools: FunctionDeclaration[]
  ): Promise<{
    response: string;
    functionCalls: FunctionCall[];
    fullResponse: any;
  }> {
    try {
      this.logger.log(`Processing query: "${userQuery}"`);
      this.logger.log(`Available tools: ${availableTools.length}`);

      // Create chat with tools
      const chat = this.model.startChat({
        tools: [
          {
            functionDeclarations: availableTools,
          },
        ],
      });

      // Send user message
      const result = await chat.sendMessage(userQuery);
      const response = result.response;

      // Check for function calls - functionCalls() is a method
      const functionCalls: FunctionCall[] = [];
      const responseFunctionCalls = response.functionCalls();
      if (responseFunctionCalls && responseFunctionCalls.length > 0) {
        this.logger.log(
          `Gemini requested ${responseFunctionCalls.length} function calls`
        );
        functionCalls.push(...responseFunctionCalls);
      }

      // Get text response
      let textResponse = '';
      try {
        textResponse = response.text() || '';
      } catch (e) {
        // If no text response (only function calls), that's okay
        this.logger.log('No text response from Gemini (function calls only)');
      }

      return {
        response: textResponse,
        functionCalls,
        fullResponse: response,
      };
    } catch (error) {
      this.logger.error('Error processing Gemini query:', error);
      throw error;
    }
  }

  /**
   * Send function results back to Gemini and get final response
   */
  async sendFunctionResults(
    chat: any,
    functionResults: FunctionResult[]
  ): Promise<string> {
    try {
      this.logger.log(`Sending ${functionResults.length} function results to Gemini`);

      // Convert function results to Gemini format
      const functionResponses = functionResults.map((result) => ({
        functionResponse: {
          name: result.name,
          response: result.response,
        },
      }));

      // Send function results
      const result = await chat.sendMessage(functionResponses);
      const response = result.response;

      return response.text();
    } catch (error) {
      this.logger.error('Error sending function results to Gemini:', error);
      throw error;
    }
  }

  /**
   * Process query with automatic tool execution
   */
  async processWithToolExecution(
    userQuery: string,
    availableTools: FunctionDeclaration[],
    toolExecutor: (toolName: string, args: any) => Promise<any>
  ): Promise<string> {
    try {
      // Initial query
      const chat = this.model.startChat({
        tools: [
          {
            functionDeclarations: availableTools,
          },
        ],
      });

      const initialResult = await chat.sendMessage(userQuery);
      const initialResponse = initialResult.response;

      // Check if Gemini wants to call functions - functionCalls() is a method
      const initialFunctionCalls = initialResponse.functionCalls();
      if (!initialFunctionCalls || initialFunctionCalls.length === 0) {
        // No function calls, return direct response
        return initialResponse.text();
      }

      this.logger.log(
        `Gemini requested ${initialFunctionCalls.length} tool executions`
      );

      // Execute all requested tools
      const functionResults: FunctionResult[] = [];
      for (const functionCall of initialFunctionCalls) {
        this.logger.log(
          `Executing tool: ${functionCall.name} with args: ${JSON.stringify(functionCall.args)}`
        );

        try {
          const toolResult = await toolExecutor(
            functionCall.name,
            functionCall.args
          );

          functionResults.push({
            name: functionCall.name,
            response: toolResult,
          });

          this.logger.log(
            `Tool ${functionCall.name} executed successfully`
          );
        } catch (error: any) {
          this.logger.error(
            `Error executing tool ${functionCall.name}:`,
            error
          );
          functionResults.push({
            name: functionCall.name,
            response: {
              error: true,
              message: error.message || 'Unknown error',
            },
          });
        }
      }

      // Send results back to Gemini for final response
      const finalResponse = await this.sendFunctionResults(
        chat,
        functionResults
      );

      return finalResponse;
    } catch (error) {
      this.logger.error(
        'Error in processWithToolExecution:',
        error
      );
      throw error;
    }
  }
}
