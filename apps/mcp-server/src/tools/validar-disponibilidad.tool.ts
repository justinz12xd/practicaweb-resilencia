import { ToolDefinition, ToolResult } from '../types';
import { BackendClient } from '../services/backend-client';

/**
 * Tool: validar_disponibilidad
 * Valida si un animal está disponible para adopción
 */
export const validarDisponibilidadTool: ToolDefinition = {
  name: 'validar_disponibilidad',
  description:
    'Valida si un animal específico está disponible para adopción. Verifica que el animal exista y que no haya sido adoptado previamente. Retorna el estado de disponibilidad y datos del animal.',
  inputSchema: {
    type: 'object',
    properties: {
      animal_id: {
        type: 'string',
        description:
          'UUID del animal a validar. Ejemplo: "123e4567-e89b-12d3-a456-426614174000"',
      },
    },
    required: ['animal_id'],
  },
};

export async function executeValidarDisponibilidad(
  args: { animal_id: string },
  backendClient: BackendClient
): Promise<ToolResult> {
  try {
    if (!args.animal_id || args.animal_id.trim() === '') {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Se requiere el ID del animal (animal_id)',
          },
        ],
        isError: true,
      };
    }

    const validation = await backendClient.validateAvailability(
      args.animal_id
    );

    if (!validation.animal) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${validation.message}`,
          },
        ],
        isError: true,
      };
    }

    if (!validation.available) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${validation.message}`,
          },
        ],
        isError: false, // Not a system error, just business logic
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ ${validation.message}\n\nDetalles:\n- ID: ${validation.animal.id}\n- Nombre: ${validation.animal.name}\n- Especie: ${validation.animal.species}\n- Estado: Disponible para adopción`,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error al validar disponibilidad: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
