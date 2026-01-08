import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { JsonRpcRequest, JsonRpcResponse } from './types';
import { ToolRegistry } from './tools/registry';
import { BackendClient } from './services/backend-client';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const toolRegistry = new ToolRegistry();
const backendClient = new BackendClient();

/**
 * JSON-RPC 2.0 Error Codes
 */
const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

/**
 * Create JSON-RPC error response
 */
function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: any
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    error: { code, message, data },
    id,
  };
}

/**
 * Create JSON-RPC success response
 */
function createSuccessResponse(
  id: string | number | null,
  result: any
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    result,
    id,
  };
}

/**
 * Validate JSON-RPC request
 */
function validateJsonRpcRequest(body: any): JsonRpcRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  if (body.jsonrpc !== '2.0') {
    return null;
  }

  if (typeof body.method !== 'string') {
    return null;
  }

  return body as JsonRpcRequest;
}

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'mcp-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Main JSON-RPC endpoint
 */
app.post('/', async (req: Request, res: Response) => {
  const requestBody = req.body;

  // Validate JSON-RPC format
  const rpcRequest = validateJsonRpcRequest(requestBody);
  if (!rpcRequest) {
    return res.status(400).json(
      createErrorResponse(
        null,
        ErrorCodes.INVALID_REQUEST,
        'Invalid JSON-RPC 2.0 request'
      )
    );
  }

  const { method, params, id } = rpcRequest;

  try {
    // Handle different RPC methods
    switch (method) {
      case 'tools/list':
        return handleToolsList(id ?? null, res);

      case 'tools/call':
        return await handleToolsCall(id ?? null, params, res);

      case 'initialize':
        return handleInitialize(id ?? null, res);

      default:
        return res.status(404).json(
          createErrorResponse(
            id || null,
            ErrorCodes.METHOD_NOT_FOUND,
            `Method not found: ${method}`
          )
        );
    }
  } catch (error: any) {
    console.error('Error processing JSON-RPC request:', error);
    return res.status(500).json(
      createErrorResponse(
        id || null,
        ErrorCodes.INTERNAL_ERROR,
        'Internal server error',
        error.message
      )
    );
  }
});

/**
 * Handle initialize method
 */
function handleInitialize(
  id: string | number | null,
  res: Response
): Response {
  return res.json(
    createSuccessResponse(id, {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'animal-adoption-mcp-server',
        version: '1.0.0',
      },
      capabilities: {
        tools: {},
      },
    })
  );
}

/**
 * Handle tools/list method
 */
function handleToolsList(
  id: string | number | null,
  res: Response
): Response {
  const tools = toolRegistry.listTools();
  return res.json(
    createSuccessResponse(id, {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    })
  );
}

/**
 * Handle tools/call method
 */
async function handleToolsCall(
  id: string | number | null,
  params: any,
  res: Response
): Promise<Response> {
  // Validate params
  if (!params || typeof params !== 'object') {
    return res.status(400).json(
      createErrorResponse(
        id || null,
        ErrorCodes.INVALID_PARAMS,
        'Invalid params: expected object'
      )
    );
  }

  const { name, arguments: args } = params;

  if (!name || typeof name !== 'string') {
    return res.status(400).json(
      createErrorResponse(
        id || null,
        ErrorCodes.INVALID_PARAMS,
        'Invalid params: "name" field is required and must be a string'
      )
    );
  }

  // Check if tool exists
  if (!toolRegistry.hasTool(name)) {
    return res.status(404).json(
      createErrorResponse(
        id || null,
        ErrorCodes.METHOD_NOT_FOUND,
        `Tool not found: ${name}`
      )
    );
  }

  try {
    // Execute the tool
    const result = await toolRegistry.executeTool(
      name,
      args || {},
      backendClient
    );

    return res.json(createSuccessResponse(id, result));
  } catch (error: any) {
    console.error(`Error executing tool ${name}:`, error);
    return res.status(500).json(
      createErrorResponse(
        id || null,
        ErrorCodes.INTERNAL_ERROR,
        `Error executing tool: ${error.message}`,
        error.stack
      )
    );
  }
}

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Use POST / for JSON-RPC requests or GET /health for health check',
  });
});

/**
 * Error handler
 */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json(
    createErrorResponse(
      null,
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      err.message
    )
  );
});

/**
 * Start server
 */
const server = app.listen(PORT, () => {
  console.log(`🚀 MCP Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 JSON-RPC endpoint: http://localhost:${PORT}/`);
  console.log(`🛠️  Available tools: ${toolRegistry.listTools().length}`);
  console.log('');
  console.log('Available Tools:');
  toolRegistry.listTools().forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await backendClient.close();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await backendClient.close();
    process.exit(0);
  });
});

export default app;
