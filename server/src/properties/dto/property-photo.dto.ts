import { IsArray, IsInt, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreatePhotoUploadDto {
  @IsString()
  @MaxLength(255)
  filename!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  sizeBytes!: number;
}

export class ReorderPhotosDto {
  @IsArray()
  @IsUUID('4', { each: true })
  photoIds!: string[];
}
