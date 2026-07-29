import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'node:stream';

@Injectable()
export class FilesService implements OnModuleInit {
  readonly publicBucket: string;
  readonly privateBucket: string;
  private readonly client: S3Client;

  constructor(config: ConfigService) {
    this.publicBucket = config.get<string>('S3_BUCKET_PUBLIC', 'domobmen-public');
    this.privateBucket = config.get<string>('S3_BUCKET_PRIVATE', 'domobmen-private');
    this.client = new S3Client({
      endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION', 'us-east-1'),
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
      },
    });
  }

  async onModuleInit() {
    await Promise.all([this.ensureBucket(this.publicBucket), this.ensureBucket(this.privateBucket)]);
  }

  async createUploadUrl(bucket: string, key: string, mimeType: string) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mimeType }),
      { expiresIn: 10 * 60 },
    );
  }

  async createDownloadUrl(bucket: string, key: string) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: 15 * 60,
    });
  }

  head(bucket: string, key: string) {
    return this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  }

  async read(bucket: string, key: string) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) throw new Error('S3 object body is empty');
    return this.streamToBuffer(result.Body as Readable);
  }

  put(bucket: string, key: string, body: Buffer, contentType: string) {
    return this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  delete(bucket: string, key: string) {
    return this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  private async ensureBucket(bucket: string) {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  }

  private async streamToBuffer(stream: Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
}
