import { MikroORM } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, Optional } from '@nestjs/common';
import axios from 'axios';
// import { CoverageEntity } from '../../entities/coverage.entity';
// import { RepoEntity } from '../../entities/repo.entity';
import {SubtitleEntity} from "./subtitle.entity";
import {ProjectEntity} from "./project.entity";

@Injectable()
export class SubtitleService {
  constructor(
    @InjectRepository(SubtitleEntity)
    private readonly subtitleRepo: EntityRepository<SubtitleEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: EntityRepository<ProjectEntity>,
  ) {}

  async getRepos(){
    const s = await this.projectRepo.findAll({
      where:{}
    })
    return {
      data: s,
      total: 100
    }
  }
}
