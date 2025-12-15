import { Repository } from "typeorm";
import { Adoption } from "./adoption.entity";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class AdoptionService {
    constructor(
      @InjectRepository(Adoption)
      private readonly repo: Repository<Adoption>
    ) {}

    async createAdoption(data): Promise<Adoption> {
  const adoption = this.repo.create({
    animal_id: data.animal_id,
    adopter_name: data.adopter_name,
  });
  return await this.repo.save(adoption);
}
}
    