import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Animal } from './animal/animal.entity';
import { AnimalConsumer } from './animal/animal.consumert';
import { AnimalService } from './animal/animal.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      username: 'pguser',
      password: 'pgpass',
      database: 'animal_db',
      entities: [Animal],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Animal]),
  ],
  controllers: [AppController, AnimalConsumer],
  providers: [AppService, AnimalService],
})
export class AppModule {}
