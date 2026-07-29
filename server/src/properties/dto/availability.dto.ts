import { AvailabilityType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class CreateAvailabilityDto {
  @Matches(datePattern)
  startsOn!: string;

  @Matches(datePattern)
  endsOn!: string;

  @IsEnum(AvailabilityType)
  type!: AvailabilityType;

  @IsInt()
  @Min(1)
  @Max(365)
  minNights!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxNights?: number;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  pointsPerNight!: number;

  @IsInt()
  @Min(1)
  @Max(50)
  maxGuests!: number;

  @IsOptional()
  @IsBoolean()
  isFlexible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class UpdateAvailabilityDto {
  @IsOptional()
  @Matches(datePattern)
  startsOn?: string;

  @IsOptional()
  @Matches(datePattern)
  endsOn?: string;

  @IsOptional()
  @IsEnum(AvailabilityType)
  type?: AvailabilityType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  minNights?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxNights?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  pointsPerNight?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxGuests?: number;

  @IsOptional()
  @IsBoolean()
  isFlexible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string | null;
}
