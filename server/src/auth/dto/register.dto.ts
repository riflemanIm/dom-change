import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'anna@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Анна' })
  @IsString()
  @Length(2, 60)
  displayName!: string;

  @ApiProperty({ minLength: 10, example: 'StrongPassword123' })
  @IsString()
  @Length(10, 128)
  @Matches(/[a-zа-яё]/i, { message: 'Пароль должен содержать букву' })
  @Matches(/\d/, { message: 'Пароль должен содержать цифру' })
  password!: string;
}
