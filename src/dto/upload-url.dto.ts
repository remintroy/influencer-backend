import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UploadUrlDto {
  @ApiProperty({
    description: 'Name of the file to be uploaded',
    example: 'profile-picture.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  fileType: string;
} 