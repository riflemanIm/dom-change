import { ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PropertyAddressDto {
  @IsString()
  @MaxLength(100)
  country!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  houseNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitudeApprox?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitudeApprox?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  exactAddress?: string;
}

export class PropertyRuleDto {
  @IsOptional()
  @IsBoolean()
  smokingAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  eventsAllowed?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  additionalRules?: string;
}

export class UpsertPropertyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(2000)
  areaSqm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  roomsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bedroomsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  bedsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxGuests?: number;

  @IsOptional()
  @IsInt()
  @Min(-5)
  @Max(200)
  floor?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  floorsTotal?: number;

  @IsOptional()
  @IsBoolean()
  hasElevator?: boolean;

  @IsOptional()
  @IsBoolean()
  allowsChildren?: boolean;

  @IsOptional()
  @IsBoolean()
  allowsPets?: boolean;

  @IsOptional()
  @IsBoolean()
  hasPetsAtHome?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresPetCare?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresPlantCare?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptsPoints?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptsDirect?: boolean;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(10000)
  pointsPerNight?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  minNights?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxNights?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PropertyAddressDto)
  address?: PropertyAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PropertyRuleDto)
  rule?: PropertyRuleDto;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  amenityIds?: string[];
}
