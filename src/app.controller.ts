import { Controller, Get, Query, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';
import { S3Service } from './common/s3/s3.service';

@ApiTags('Health check and common')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly s3Service: S3Service,
  ) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('upload-url')
  @Public()
  getSignedUrl(@Query('fileName') fileName: string, @Query('fileType') fileType: string) {
    return this.s3Service.generateUploadUrl({ fileName, fileType });
  }
}
