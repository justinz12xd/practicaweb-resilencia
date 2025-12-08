import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnimalModule } from './animal/animal.module';
import { AdoptionModule } from './adoption/adoption.module';

@Module({
  imports: [
    AnimalModule,
    AdoptionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
