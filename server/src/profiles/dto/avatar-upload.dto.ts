import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateAvatarUploadDto {
  @IsString() @MaxLength(255)
  filename!: string;

  @IsString()
  mimeType!: string;

  @IsInt() @Min(1) @Max(5 * 1024 * 1024)
  sizeBytes!: number;
}
