import { Field, ObjectType } from '@nestjs/graphql';
import { JSONScalar } from '../../scalars/json.scalar';

@ObjectType()
export class SubtitleOutput {
  @Field()
  id!: string;

  @Field()
  projectID!: string;

  @Field()
  startTime!: string;

  @Field()
  endTime!: string;

  @Field(() => JSONScalar)
  content!: unknown;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}



