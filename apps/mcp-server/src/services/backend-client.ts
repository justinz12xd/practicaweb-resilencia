import { Pool } from 'pg';
import axios, { AxiosInstance } from 'axios';
import { Animal } from '../types';

/**
 * Backend Client Service
 * Handles communication with PostgreSQL databases and HTTP Gateway
 */
export class BackendClient {
  private animalDbPool: Pool;
  private adoptionDbPool: Pool;
  private httpClient: AxiosInstance;

  constructor() {
    // Animal Database Connection
    this.animalDbPool = new Pool({
      host: process.env.ANIMAL_DB_HOST || 'localhost',
      port: parseInt(process.env.ANIMAL_DB_PORT || '5434'),
      database: process.env.ANIMAL_DB_NAME || 'animal_db',
      user: process.env.ANIMAL_DB_USER || 'pguser',
      password: process.env.ANIMAL_DB_PASSWORD || 'pgpass',
    });

    // Adoption Database Connection
    this.adoptionDbPool = new Pool({
      host: process.env.ADOPTION_DB_HOST || 'localhost',
      port: parseInt(process.env.ADOPTION_DB_PORT || '5433'),
      database: process.env.ADOPTION_DB_NAME || 'adoption_db',
      user: process.env.ADOPTION_DB_USER || 'pguser',
      password: process.env.ADOPTION_DB_PASSWORD || 'pgpass',
    });

    // HTTP Client for Gateway
    this.httpClient = axios.create({
      baseURL: process.env.GATEWAY_URL || 'http://localhost:3000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Search animals by name and/or availability
   */
  async searchAnimals(
    nombre?: string,
    disponible?: boolean
  ): Promise<Animal[]> {
    try {
      let query = 'SELECT id, name, species, available FROM animals WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (nombre) {
        query += ` AND LOWER(name) LIKE LOWER($${paramIndex})`;
        params.push(`%${nombre}%`);
        paramIndex++;
      }

      if (disponible !== undefined) {
        query += ` AND available = $${paramIndex}`;
        params.push(disponible);
      }

      query += ' ORDER BY name ASC';

      const result = await this.animalDbPool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error searching animals:', error);
      throw new Error(`Failed to search animals: ${error}`);
    }
  }

  /**
   * Get animal by ID
   */
  async getAnimalById(animalId: string): Promise<Animal | null> {
    try {
      const result = await this.animalDbPool.query(
        'SELECT id, name, species, available FROM animals WHERE id = $1',
        [animalId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting animal by ID:', error);
      throw new Error(`Failed to get animal: ${error}`);
    }
  }

  /**
   * Validate if animal is available for adoption
   */
  async validateAvailability(animalId: string): Promise<{
    available: boolean;
    animal: Animal | null;
    message: string;
  }> {
    try {
      const animal = await this.getAnimalById(animalId);

      if (!animal) {
        return {
          available: false,
          animal: null,
          message: 'Animal no encontrado',
        };
      }

      if (!animal.available) {
        return {
          available: false,
          animal,
          message: `El animal ${animal.name} ya fue adoptado`,
        };
      }

      return {
        available: true,
        animal,
        message: `Animal disponible: ${animal.name} (${animal.species})`,
      };
    } catch (error) {
      console.error('Error validating availability:', error);
      throw new Error(`Failed to validate availability: ${error}`);
    }
  }

  /**
   * Create adoption via HTTP Gateway (maintains event-driven flow)
   */
  async createAdoption(
    animalId: string,
    adopterName: string,
    adopterEmail: string
  ): Promise<{ success: boolean; message: string; adoptionId?: string }> {
    try {
      const response = await this.httpClient.post('/adoptions', {
        animal_id: animalId,
        adopter_name: adopterName,
        adopter_email: adopterEmail,
      });

      if (response.status === 201 || response.status === 200) {
        return {
          success: true,
          message: 'Adopción creada exitosamente',
          adoptionId: response.data?.id,
        };
      }

      return {
        success: false,
        message: `Error: ${response.statusText}`,
      };
    } catch (error: any) {
      console.error('Error creating adoption:', error);
      const errorMessage =
        error.response?.data?.message || error.message || 'Error desconocido';
      return {
        success: false,
        message: `No se pudo crear la adopción: ${errorMessage}`,
      };
    }
  }

  /**
   * Get adoption statistics (optional - for additional context)
   */
  async getAdoptionStats(): Promise<{
    total: number;
    pending: number;
    completed: number;
  }> {
    try {
      const result = await this.adoptionDbPool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed
        FROM adoptions
      `);

      const row = result.rows[0];
      return {
        total: parseInt(row.total || '0'),
        pending: parseInt(row.pending || '0'),
        completed: parseInt(row.completed || '0'),
      };
    } catch (error) {
      console.error('Error getting adoption stats:', error);
      return { total: 0, pending: 0, completed: 0 };
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.animalDbPool.end();
    await this.adoptionDbPool.end();
  }
}
