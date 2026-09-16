import { Type } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min, MinLength, NotEquals } from 'class-validator';

export class AdjustPointsDto {
  @Type(() => Number)
  @IsInt()
  @NotEquals(0)
  @Min(-1_000_000)
  @Max(1_000_000)
  amount!: number;

  @IsString()
  @MinLength(5)
  @MaxLength(300)
  reason!: string;
}
