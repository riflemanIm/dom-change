import { ExchangeType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class CreateExchangeRequestDto {
  @IsUUID()
  targetPropertyId!: string;

  @IsEnum(ExchangeType)
  type!: ExchangeType;

  @IsOptional()
  @IsUUID()
  offeredPropertyId?: string;

  @Matches(datePattern)
  startsOn!: string;

  @Matches(datePattern)
  endsOn!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  guests!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
