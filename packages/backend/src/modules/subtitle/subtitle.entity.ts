import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import {JSONScalar} from "../../scalars/json.scalar";

@Entity({ tableName: 'subtitle' })
export class SubtitleEntity {
  @PrimaryKey()
  id!: string;

  @Property()
  startTime!: string;

  @Property()
  endTime!: string;

  @Property({
    fieldName: 'description',
  })
  content!: JSONScalar;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}
