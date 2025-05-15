import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { S3Service } from './common/s3/s3.service';
import { UploadUrlDto } from './common/dto/upload-url.dto';

@ApiTags('Health check and common')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly s3Service: S3Service,
  ) { }

  @Get()
  @Public()
  getHello() {
    return this.appService.getHello();
  }

  @Get('upload-url')
  @Public()
  @ApiOperation({ summary: 'Get signed URL for file upload' })
  @ApiQuery({ name: 'fileName', type: String, required: true })
  @ApiQuery({ name: 'fileType', type: String, required: false })
  getSignedUrl(@Query() query: UploadUrlDto) {
    return this.s3Service.generateUploadUrl(query);
  }
}
