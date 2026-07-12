import type { CorsOptions } from 'cors';
import { env } from './env';

// 'http://localhost:3000' is only added outside production — an allowlist
// that always includes it would let any script running on a developer's
// own localhost:3000 make credentialed requests against the production API.
const allowedOrigins = Array.from(
  new Set([env.FRONTEND_URL, ...(env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : [])]),
);

// Dev-only: testing from a phone/tablet on the same WiFi (or same Tailscale
// tailnet) means the frontend is reached via the dev machine's LAN/VPN IP
// (Next.js prints this as its "Network:" URL, e.g. http://192.168.1.23:3000
// or, over Tailscale, http://100.x.x.x:3000) instead of localhost, so
// that's the Origin header the backend actually sees. Scoped to RFC 1918
// private ranges (192.168.x.x / 10.x.x.x / 172.16-31.x.x) plus the
// 100.64.0.0/10 CGNAT range Tailscale assigns from, on port 3000 only, and
// only outside production — never matches a real public domain.
const PRIVATE_LAN_ORIGIN_PATTERN =
  /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}):3000$/;

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (env.NODE_ENV !== 'production' && PRIVATE_LAN_ORIGIN_PATTERN.test(origin)) return true;
  return false;
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
