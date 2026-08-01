import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateExchangeReviewDto {
  @IsInt() @Min(1) @Max(5)
  rating!: number;

  @IsInt() @Min(1) @Max(5)
  cleanlinessRating!: number;

  @IsInt() @Min(1) @Max(5)
  communicationRating!: number;

  @IsString() @MinLength(10) @MaxLength(2000)
  comment!: string;
}
