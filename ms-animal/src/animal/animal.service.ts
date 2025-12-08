import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Animal } from './animal.entity';

@Injectable()
export class AnimalService {
  constructor(
    @InjectRepository(Animal)
    private repo: Repository<Animal>,
  ) {}

  async create(data: { name: string; species: string }): Promise<Animal> {
    const animal = this.repo.create(data);
    return this.repo.save(animal);
  }

  async findAll(): Promise<Animal[]> {
    return this.repo.find();
  }

  async markAsAdopted(animalId: string) {
    const animal = await this.repo.findOneBy({ id: animalId });
    if (!animal) throw new Error('Animal not found');
    
    if (!animal.available) {
      console.log('⚠️ Animal ya estaba adoptado, ignorando duplicado');
      return false;
    }
    
    animal.available = false;
    await this.repo.save(animal);
    console.log('✅ Animal adoptado exitosamente');
    return true;
  }
}
