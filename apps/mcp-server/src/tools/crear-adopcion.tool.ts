import { ToolDefinition, ToolResult } from '../types';
import { BackendClient } from '../services/backend-client';

/**
 * Tool: crear_adopcion
 * Crea un registro de adopción para un animal
 */
export const crearAdopcionTool: ToolDefinition = {
  name: 'crear_adopcion',
  description:
    'Crea un nuevo registro de adopción para un animal disponible. Este Tool ejecuta la adopción completa a través del API Gateway, lo que activa el flujo event-driven (marca el animal como no disponible y envía notificaciones webhook). Requiere ID del animal, nombre y email del adoptante.',
  inputSchema: {
    type: 'object',
    properties: {
      animal_id: {
        type: 'string',
        description:
          'UUID del animal a adoptar. Ejemplo: "123e4567-e89b-12d3-a456-426614174000"',
      },
      adopter_name: {
        type: 'string',
        description:
          'Nombre completo del adoptante. Ejemplo: "Juan Pérez García"',
      },
      adopter_email: {
        type: 'string',
        description:
          'Email de contacto del adoptante. Ejemplo: "juan@example.com"',
      },
    },
    required: ['animal_id', 'adopter_name', 'adopter_email'],
  },
};

export async function executeCrearAdopcion(
  args: { animal_id: string; adopter_name: string; adopter_email: string },
  backendClient: BackendClient
): Promise<ToolResult> {
  try {
    // Validate required fields
    const missingFields = [];
    if (!args.animal_id || args.animal_id.trim() === '')
      missingFields.push('animal_id');
    if (!args.adopter_name || args.adopter_name.trim() === '')
      missingFields.push('adopter_name');
    if (!args.adopter_email || args.adopter_email.trim() === '')
      missingFields.push('adopter_email');

    if (missingFields.length > 0) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Faltan campos requeridos: ${missingFields.join(', ')}`,
          },
        ],
        isError: true,
      };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.adopter_email)) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: El email proporcionado no tiene un formato válido',
          },
        ],
        isError: true,
      };
    }

    // First, validate availability
    const validation = await backendClient.validateAvailability(
      args.animal_id
    );

    if (!validation.available) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ No se puede crear la adopción: ${validation.message}`,
          },
        ],
        isError: true,
      };
    }

    // Create adoption via Gateway
    const result = await backendClient.createAdoption(
      args.animal_id,
      args.adopter_name,
      args.adopter_email
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ ¡Adopción creada exitosamente!\n\n📋 Detalles:\n- Animal: ${validation.animal?.name} (${validation.animal?.species})\n- Adoptante: ${args.adopter_name}\n- Email: ${args.adopter_email}\n- ID de Adopción: ${result.adoptionId || 'Generado'}\n\n🔔 Se han enviado notificaciones webhook automáticamente.\n💾 El animal ha sido marcado como no disponible.`,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error al crear adopción: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
