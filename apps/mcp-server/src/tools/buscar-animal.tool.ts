import { ToolDefinition, ToolResult } from '../types';
import { BackendClient } from '../services/backend-client';


export const buscarAnimalTool: ToolDefinition = {
  name: 'buscar_animal',
  description:
    'Busca animales en el sistema de adopción por nombre (búsqueda parcial) o por estado de disponibilidad. Retorna lista de animales con su ID, nombre, especie y disponibilidad.',
  inputSchema: {
    type: 'object',
    properties: {
      nombre: {
        type: 'string',
        description:
          'Nombre del animal a buscar (búsqueda parcial, no case-sensitive). Ejemplo: "Max", "Bobby"',
      },
      disponible: {
        type: 'boolean',
        description:
          'Filtrar por disponibilidad: true para animales disponibles, false para adoptados',
      },
    },
    required: [],
  },
};

export async function executeBuscarAnimal(
  args: { nombre?: string; disponible?: boolean },
  backendClient: BackendClient
): Promise<ToolResult> {
  try {
    const animals = await backendClient.searchAnimals(
      args.nombre,
      args.disponible
    );

    if (animals.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No se encontraron animales con los criterios especificados.',
          },
        ],
      };
    }

    const animalList = animals
      .map(
        (a) =>
          `- ID: ${a.id}\n  Nombre: ${a.name}\n  Especie: ${a.species}\n  Disponible: ${a.available ? 'Sí' : 'No (ya adoptado)'}`
      )
      .join('\n\n');

    const filterInfo = [];
    if (args.nombre) filterInfo.push(`nombre "${args.nombre}"`);
    if (args.disponible !== undefined)
      filterInfo.push(
        `disponibilidad ${args.disponible ? 'disponibles' : 'adoptados'}`
      );
    const filterText =
      filterInfo.length > 0 ? ` con ${filterInfo.join(' y ')}` : '';

    return {
      content: [
        {
          type: 'text',
          text: `Encontrados ${animals.length} animales${filterText}:\n\n${animalList}`,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error al buscar animales: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
