import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import {JSONScalar} from "../../scalars/json.scalar";

@Entity({ tableName: 'subtitle' })
export class SubtitleEntity {
  @PrimaryKey()
  id!: string;

  @Property({ fieldName: 'start_time' })
  startTime!: string;

  @Property({ fieldName: 'end_time' })
  endTime!: string;

  @Property({ fieldName: 'project_id' })
  projectId!: string;

  @Property({ fieldName: 'content' })
  content!: JSONScalar;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}
