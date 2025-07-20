import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SignContractDto {
  @ApiProperty({ description: 'Image url of signature', required: true })
  @IsString()
  signatureImage: string;
}
