import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { SubtitleEntity } from './subtitle.entity';
import { ProjectEntity } from './project.entity';
import { SubtitleCreateInput, SubtitleDeleteInput, SubtitleListInput, SubtitleUpdateInput } from './subtitle.input';

@Injectable()
export class SubtitleService {
  constructor(
    @InjectRepository(SubtitleEntity)
    private readonly subtitleRepo: EntityRepository<SubtitleEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: EntityRepository<ProjectEntity>,
  ) {}

  async project(projectID:string){
    const s = await this.projectRepo.findOne(projectID)
    return s
  }

  private buildId(projectId: string, startTime: string): string {
    return `${projectId}_${startTime}`;
  }

  async list(input: SubtitleListInput): Promise<SubtitleEntity[]> {
    const where: any = { projectId: input.projectId };
    if (input.startAfter) where.startTime = { $gte: input.startAfter };
    if (input.endBefore) where.endTime = { $lte: input.endBefore };
    return this.subtitleRepo.find(where, { orderBy: { startTime: 'asc' } });
  }

  async create(input: SubtitleCreateInput): Promise<SubtitleEntity> {
    const id = this.buildId(input.projectId, input.startTime);
    const exists = await this.subtitleRepo.findOne({ id });
    if (exists) {
      // 简单覆盖策略：若已存在相同起始时间，直接更新内容与结束时间
      exists.endTime = input.endTime;
      (exists as any).content = input.content as any;
      (exists as any).updatedAt = new Date();
      await this.subtitleRepo.getEntityManager().flush();
      return exists;
    }
    const entity = this.subtitleRepo.create({
      id,
      projectId: input.projectId,
      startTime: input.startTime,
      endTime: input.endTime,
      content: input.content as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    this.subtitleRepo.getEntityManager().persist(entity);
    await this.subtitleRepo.getEntityManager().flush();
    return entity;
  }

  async update(input: SubtitleUpdateInput): Promise<SubtitleEntity | null> {
    const entity = await this.subtitleRepo.findOne({ id: input.id });
    if (!entity) return null;
    if (input.startTime) entity.startTime = input.startTime;
    if (input.endTime) entity.endTime = input.endTime;
    if (typeof input.content !== 'undefined') (entity as any).content = input.content as any;
    (entity as any).updatedAt = new Date();
    await this.subtitleRepo.getEntityManager().flush();
    return entity;
  }

  async delete(input: SubtitleDeleteInput): Promise<boolean> {
    const entity = await this.subtitleRepo.findOne({ id: input.id });
    if (!entity) return true;
    this.subtitleRepo.getEntityManager().remove(entity);
    await this.subtitleRepo.getEntityManager().flush();
    return true;
  }
}
