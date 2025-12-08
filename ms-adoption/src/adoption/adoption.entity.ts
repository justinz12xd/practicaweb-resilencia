import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('adoption')
export class Adoption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  animal_id: string;

  @Column()
  adopter_name: string;

  @Column({ default: 'PENDING' })
  status: string;
}
