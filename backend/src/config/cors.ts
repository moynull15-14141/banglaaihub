import type { CorsOptions } from 'cors';
import { env } from './env';

// 'http://localhost:3000' is only added outside production — an allowlist
// that always includes it would let any script running on a developer's
// own localhost:3000 make credentialed requests against the production API.
const allowedOrigins = Array.from(
  new Set([env.FRONTEND_URL, ...(env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : [])]),
);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
