import { Field, InputType } from '@nestjs/graphql';
import { JSONScalar } from '../../scalars/json.scalar';

@InputType()
export class SubtitleListInput {
  @Field()
  projectID!: string;

  @Field({ nullable: true })
  startAfter?: string; // optional filter: startTime >= startAfter

  @Field({ nullable: true })
  endBefore?: string; // optional filter: endTime <= endBefore
}

@InputType()
export class SubtitleCreateInput {
  @Field()
  projectID!: string;

  @Field()
  startTime!: string;

  @Field()
  endTime!: string;

  @Field(() => JSONScalar)
  content!: unknown; // { chinese: string; translateList: Array<{ ja: string; fiftytones: string; romaji: string }>}  // romaji 兼容旧字段 fiftytonesromaji
}

@InputType()
export class SubtitleUpdateInput {
  @Field()
  id!: string; // projectId + startTime

  @Field({ nullable: true })
  startTime?: string;

  @Field({ nullable: true })
  endTime?: string;

  @Field(() => JSONScalar, { nullable: true })
  content?: unknown;
}

@InputType()
export class SubtitleDeleteInput {
  @Field()
  id!: string; // projectId + startTime
}



