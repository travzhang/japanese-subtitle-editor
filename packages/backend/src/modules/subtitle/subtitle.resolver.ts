import {
  Args,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { SubtitleService } from './subtitle.service';
import {ProjectOutput} from "./project.output";
import {ProjectInput} from "./project.input";



@Resolver()
export class SubtitleResolver {
  constructor(private readonly subtitleService: SubtitleService) {}
  @Query(() => ProjectOutput)
  project(
    @Args('input', { type: () => ProjectInput })
    input: ProjectInput,
  ) {
    return this.subtitleService.project(input.projectID)
  }
}
