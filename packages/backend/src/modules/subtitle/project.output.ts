import {Field, ObjectType} from "@nestjs/graphql";

@ObjectType()
export class ProjectOutput {
  @Field()
  id!: string;

  @Field()
  pathWithNamespace!: string;

  @Field()
  description!: string;

  // @Field()
  // bu!: string;

  // @Field()
  // config!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
