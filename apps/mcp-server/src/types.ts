/**
 * JSON-RPC 2.0 Types
 */

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number | null;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: JsonRpcError;
  id: string | number | null;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

/**
 * MCP Tool Types
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCallParams {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * Domain Types
 */

export interface Animal {
  id: string;
  name: string;
  species: string;
  available: boolean;
}

export interface Adoption {
  id: string;
  animal_id: string;
  adopter_name: string;
  adopter_email: string;
  status: string;
  created_at: Date;
}
