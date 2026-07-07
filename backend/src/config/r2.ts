import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined,
  credentials:
    env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export const r2BucketName = env.R2_BUCKET_NAME;

// Undefined unless a public domain is later configured for the bucket — see
// R2_PUBLIC_URL in env.ts. StorageService.getPublicUrl() returns null when
// this is unset, so callers must fall back to a signed URL.
export const r2PublicUrl = env.R2_PUBLIC_URL?.replace(/\/+$/, '');
