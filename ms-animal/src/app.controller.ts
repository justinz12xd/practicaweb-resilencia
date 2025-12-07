import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { AnimalService } from './animal/animal.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly animalService: AnimalService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('animals')
  async createAnimal(@Body() body: { name: string; species: string }) {
    const animal = await this.animalService.create(body);
    console.log(`🐾 Animal creado: ${animal.id}`);
    return animal;
  }

  @Get('animals')
  async getAnimals() {
    return this.animalService.findAll();
  }
}
