import { Controller, Get } from '@nestjs/common';
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

  @Get('animals')
  async getAnimals() {
    return this.animalService.findAll();
  }
}
