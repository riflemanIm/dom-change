import { PropertyType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export enum ExchangeFilter {
  POINTS = 'POINTS',
  DIRECT = 'DIRECT',
}

export enum PropertySort {
  NEWEST = 'NEWEST',
  PRICE_ASC = 'PRICE_ASC',
  PRICE_DESC = 'PRICE_DESC',
}

const booleanQuery = ({ value }: { value: unknown }) => value === 'true' ? true : value === 'false' ? false : value;

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
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  bedrooms?: number;

  @IsOptional()
  @Transform(booleanQuery)
  @IsBoolean()
  allowsChildren?: boolean;

  @IsOptional()
  @Transform(booleanQuery)
  @IsBoolean()
  allowsPets?: boolean;

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
  @IsEnum(PropertySort)
  sort: PropertySort = PropertySort.NEWEST;

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
