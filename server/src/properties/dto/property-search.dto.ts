import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export enum ExchangeFilter {
  POINTS = 'POINTS',
  DIRECT = 'DIRECT',
}

export class PropertySearchDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Matches(datePattern)
  startsOn?: string;

  @IsOptional()
  @Matches(datePattern)
  endsOn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  guests?: number;

  @IsOptional()
  @IsEnum(ExchangeFilter)
  exchange?: ExchangeFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPoints?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPoints?: number;

  @IsOptional()
  @IsString()
  amenities?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  limit = 12;
}
