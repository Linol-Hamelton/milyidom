import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { promises as fs } from 'fs';
import { join } from 'path';
import { extname } from 'path';

export interface UploadResult {
  /** Public URL for the file */
  url: string;
  /** Relative key/path stored in the DB */
  key: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null = null;
  private readonly bucket: string | null;
  private readonly cdnBase: string | null;
  private readonly localRoot: string;
  private readonly localBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const bucket = config.get<string>('storage.bucket');
    const region = config.get<string>('storage.region', 'auto');
    const endpoint = config.get<string>('storage.endpoint'); // R2 / MinIO
    const accessKeyId = config.get<string>('storage.accessKeyId');
    const secretAccessKey = config.get<string>('storage.secretAccessKey');

    this.bucket = bucket || null;
    this.cdnBase = config.get<string>('storage.cdnBase') ?? null;
    this.localRoot =
      config.get<string>('images.root') ?? join(process.cwd(), '..', '..', 'images');
    this.localBaseUrl = (
      config.get<string>('images.baseUrl') ?? 'http://localhost:4001/images'
    ).replace(/\/$/, '');

    if (bucket && accessKeyId && secretAccessKey) {
      this.s3 = new S3Client({
        region,
        ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(`S3 storage configured — bucket: ${bucket}`);
    } else {
      this.logger.warn('S3 credentials not set — using local disk storage (dev mode)');
    }
  }

  /**
   * Upload a file buffer. Returns URL and storage key.
   * Falls back to local disk when S3 is not configured.
   */
  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    keyPrefix = 'uploads',
  ): Promise<UploadResult> {
    const ext = (extname(originalName) || '.jpg').toLowerCase();
    const uniqueKey = `${keyPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    if (this.s3 && this.bucket) {
      return this.uploadToS3(buffer, uniqueKey, mimeType);
    }
    return this.uploadToLocal(buffer, uniqueKey);
  }

  private async uploadToS3(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadResult> {
    const upload = new Upload({
      client: this.s3!,
      params: {
        Bucket: this.bucket!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      },
    });

    await upload.done();
    const url = this.cdnBase
      ? `${this.cdnBase.replace(/\/$/, '')}/${key}`
      : `https://${this.bucket}.s3.amazonaws.com/${key}`;

    return { url, key };
  }

  private async uploadToLocal(buffer: Buffer, key: string): Promise<UploadResult> {
    const destination = join(this.localRoot, key);
    const dir = destination.substring(0, destination.lastIndexOf('/'));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(destination, buffer);
    const url = `${this.localBaseUrl}/${key}`;
    return { url, key };
  }
}
