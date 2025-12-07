import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Animal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'Sin nombre' })
  name: string;

  @Column({ default: 'Desconocido' })
  species: string;

  @Column({ default: true })
  available: boolean;
}
