import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'anna@example.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Одноразовый token из письма' })
  @IsString()
  @Length(43, 128)
  token!: string;

  @ApiProperty({ minLength: 10, example: 'NewStrongPassword123' })
  @IsString()
  @Length(10, 128)
  @Matches(/[a-zа-яё]/i, { message: 'Пароль должен содержать букву' })
  @Matches(/\d/, { message: 'Пароль должен содержать цифру' })
  password!: string;
}
