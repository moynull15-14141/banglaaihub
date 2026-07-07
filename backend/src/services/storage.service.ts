import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2BucketName, r2Client } from '../config/r2';
import { ApiError } from '../utils/ApiError';

const DOWNLOAD_URL_EXPIRY_SECONDS = 60 * 60;
const AVATAR_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export class StorageService {
  // Shared by every upload flow (datasets, avatars, ...): never trusts the
  // client-provided filename — strips path segments, keeps only a safe
  // extension, and always writes under a fresh UUID object name.
  private static async uploadObject(
    keyPrefix: string,
    file: UploadedFile,
  ): Promise<{ key: string; checksum: string }> {
    if (!r2BucketName) {
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'File storage is not configured.');
    }

    const safeExtension = path
      .extname(path.basename(file.originalname))
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '');
    const key = `${keyPrefix}/${randomUUID()}${safeExtension}`;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2BucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { key, checksum };
  }

  static uploadDatasetFile(
    resourceId: string,
    file: UploadedFile,
  ): Promise<{ key: string; checksum: string }> {
    return StorageService.uploadObject(`datasets/${resourceId}`, file);
  }

  static uploadAvatar(
    userId: string,
    file: UploadedFile,
  ): Promise<{ key: string; checksum: string }> {
    return StorageService.uploadObject(`avatars/${userId}`, file);
  }

  static uploadContributorSample(
    userId: string,
    file: UploadedFile,
  ): Promise<{ key: string; checksum: string }> {
    return StorageService.uploadObject(`contributor-applications/${userId}`, file);
  }

  static async getSignedDownloadUrl(
    key: string,
    expirySeconds = DOWNLOAD_URL_EXPIRY_SECONDS,
  ): Promise<string> {
    if (!r2BucketName) {
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'File storage is not configured.');
    }

    return getSignedUrl(r2Client, new GetObjectCommand({ Bucket: r2BucketName, Key: key }), {
      expiresIn: expirySeconds,
    });
  }

  static getSignedAvatarUrl(key: string): Promise<string> {
    return StorageService.getSignedDownloadUrl(key, AVATAR_URL_EXPIRY_SECONDS);
  }
}
