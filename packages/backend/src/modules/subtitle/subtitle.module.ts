import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { CoverageEntity } from '../../entities/coverage.entity';
import { RepoEntity } from '../../entities/repo.entity';
import { SubtitleResolver } from './subtitle.resolver';
import { SubtitleService } from './subtitle.service';
import {SubtitleEntity} from "./subtitle.entity";
import {ProjectEntity} from "./project.entity";

@Module({
  imports: [
    MikroOrmModule.forFeature({ entities: [RepoEntity, CoverageEntity,SubtitleEntity,ProjectEntity] }),
  ],
  providers: [SubtitleService, SubtitleResolver],
})
export class SubtitleModule {}
