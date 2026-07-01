import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_S3_REGION') || 'us-east-1';
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET') || null;

    if (accessKeyId && secretAccessKey && this.bucketName) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('S3 Client initialized successfully.');
    } else {
      this.logger.warn('AWS S3 configuration missing. Falling back to local storage.');
    }
  }

  async uploadFile(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<string> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const key = `receipts/${uniqueSuffix}-${file.originalname}`;

    if (this.s3Client && this.bucketName) {
      try {
        const region = this.configService.get<string>('AWS_S3_REGION') || 'us-east-1';
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );
        return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
      } catch (err: any) {
        this.logger.error(`S3 Upload failed: ${err.message}. Falling back to local storage.`);
      }
    }

    // Local disk fallback
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filename = `${uniqueSuffix}-${file.originalname}`;
    const localFilePath = join(uploadsDir, filename);
    fs.writeFileSync(localFilePath, file.buffer);
    return `/uploads/${filename}`;
  }
}
