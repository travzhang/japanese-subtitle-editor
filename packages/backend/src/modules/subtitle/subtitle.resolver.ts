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
import { SubtitleCreateInput, SubtitleDeleteInput, SubtitleListInput, SubtitleUpdateInput } from './subtitle.input';
import { SubtitleOutput } from './subtitle.output';



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

  @Query(() => [SubtitleOutput])
  subtitles(
    @Args('input', { type: () => SubtitleListInput }) input: SubtitleListInput,
  ) {
    return this.subtitleService.list(input);
  }

  @Mutation(() => SubtitleOutput)
  createSubtitle(
    @Args('input', { type: () => SubtitleCreateInput }) input: SubtitleCreateInput,
  ) {
    return this.subtitleService.create(input);
  }

  @Mutation(() => SubtitleOutput, { nullable: true })
  updateSubtitle(
    @Args('input', { type: () => SubtitleUpdateInput }) input: SubtitleUpdateInput,
  ) {
    return this.subtitleService.update(input);
  }

  @Mutation(() => Boolean)
  deleteSubtitle(
    @Args('input', { type: () => SubtitleDeleteInput }) input: SubtitleDeleteInput,
  ) {
    return this.subtitleService.delete(input);
  }
}
