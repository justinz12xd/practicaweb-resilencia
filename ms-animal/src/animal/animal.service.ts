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

  async create(data: { name: string; species: string }): Promise<{ animal: Animal; isNew: boolean }> {
    const existingAnimal = await this.repo.findOne({
      where: { name: data.name, species: data.species },
    });

    if (existingAnimal) {
      return { animal: existingAnimal, isNew: false };
    }

    // Si no existe, crear nuevo
    const animal = this.repo.create(data);
    const savedAnimal = await this.repo.save(animal);
    return { animal: savedAnimal, isNew: true };
  }

  async findAll(): Promise<Animal[]> {
    return this.repo.find();
  }

  async markAsAdopted(animalId: string) {
    const animal = await this.repo.findOneBy({ id: animalId });
    if (!animal) throw new Error('Animal not found');
    
    if (!animal.available) {
      return false;  // Ya estaba adoptado
    }
    
    animal.available = false;
    await this.repo.save(animal);
    return true;  // Adoptado exitosamente
  }
}
