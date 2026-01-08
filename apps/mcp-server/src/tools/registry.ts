import { ToolDefinition } from '../types';
import {
  buscarAnimalTool,
  executeBuscarAnimal,
} from './buscar-animal.tool';
import {
  validarDisponibilidadTool,
  executeValidarDisponibilidad,
} from './validar-disponibilidad.tool';
import {
  crearAdopcionTool,
  executeCrearAdopcion,
} from './crear-adopcion.tool';
import { BackendClient } from '../services/backend-client';

/**
 * Tool Registry
 * Central registry for all available MCP Tools
 */

export interface ToolExecutor {
  definition: ToolDefinition;
  execute: (args: any, backendClient: BackendClient) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, ToolExecutor> = new Map();

  constructor() {
    this.registerTools();
  }

  private registerTools(): void {
    // Register Tool 1: Búsqueda
    this.tools.set(buscarAnimalTool.name, {
      definition: buscarAnimalTool,
      execute: executeBuscarAnimal,
    });

    // Register Tool 2: Validación
    this.tools.set(validarDisponibilidadTool.name, {
      definition: validarDisponibilidadTool,
      execute: executeValidarDisponibilidad,
    });

    // Register Tool 3: Acción
    this.tools.set(crearAdopcionTool.name, {
      definition: crearAdopcionTool,
      execute: executeCrearAdopcion,
    });
  }

  /**
   * Get all tool definitions (for tools/list)
   */
  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.definition);
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): ToolExecutor | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    name: string,
    args: any,
    backendClient: BackendClient
  ): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.execute(args, backendClient);
  }
}
