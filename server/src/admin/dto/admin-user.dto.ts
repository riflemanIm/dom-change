import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus, TrustLevel, UserRole } from '@prisma/client';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 60)
  displayName!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @Length(10, 128)
  @Matches(/[a-zа-яё]/i, { message: 'Пароль должен содержать букву' })
  @Matches(/\d/, { message: 'Пароль должен содержать цифру' })
  password!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}

export class UpdateAdminUserDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 60) displayName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(10, 128)
  @Matches(/[a-zа-яё]/i, { message: 'Пароль должен содержать букву' })
  @Matches(/\d/, { message: 'Пароль должен содержать цифру' }) password?: string;
  @ApiPropertyOptional({ enum: UserRole }) @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @ApiPropertyOptional({ enum: AccountStatus }) @IsOptional() @IsEnum(AccountStatus) status?: AccountStatus;
  @ApiPropertyOptional({ enum: TrustLevel }) @IsOptional() @IsEnum(TrustLevel) trustLevel?: TrustLevel;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailVerified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() phoneVerified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 30) phone?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 60) surname?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 60) patronymic?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 100) city?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 2000) description?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(20) adultsCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(20) childrenCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasPets?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) interests?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) travelPreferences?: string[];
}
