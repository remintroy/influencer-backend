import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private s3: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new S3Client({
      region: configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: configService.get('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: configService.get('AWS_SECRET_KEY') || '',
      },
    });
  }

  async generateUploadUrl({ fileName, fileType }: { fileName: string; fileType: string }) {
    const key = `${Date.now()}-${fileName?.slice?.(0, 20) || ''}`;

    const command = new PutObjectCommand({
      Bucket: this.configService.get('AWS_BUCKET_NAME'),
      Key: key,
      ContentType: fileType || 'application/octet-stream',
    });

    const url = await getSignedUrl(this.s3, command, {
      expiresIn: 60 * 5, // URL expires in 5 minutes
    });

    return { url, key };
  }

  async uploadFile({
    buffer,
    fileName,
    fileType,
  }: {
    buffer: Buffer;
    fileName: string;
    fileType: string;
  }): Promise<{ key: string; url: string }> {
    const key = `${Date.now()}-${fileName?.slice?.(0, 20) || ''}`;
    const command = new PutObjectCommand({
      Bucket: this.configService.get('AWS_BUCKET_NAME'),
      Key: key,
      Body: buffer,
      ContentType: fileType || 'application/octet-stream',
    });
    await this.s3.send(command);
    // Optionally, construct the file URL (public or signed, depending on your bucket policy)
    const url = `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
    return { key, url };
  }
}
