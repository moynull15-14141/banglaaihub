import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  // Optional: only set if the bucket is later given public access (e.g. a
  // r2.dev subdomain or custom domain). Unset today — every URL StorageService
  // hands out is a time-limited signed URL against the private bucket.
  R2_PUBLIC_URL: z.string().url().optional(),

  MEILISEARCH_HOST: z.string().url(),
  MEILISEARCH_ADMIN_KEY: z.string().optional(),
  MEILISEARCH_SEARCH_KEY: z.string().optional(),

  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
});

function loadEnv(): z.infer<typeof envSchema> {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment configuration:');
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
    throw new Error('Environment validation failed. See errors above.');
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
