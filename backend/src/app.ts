import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { corsOptions } from './config/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { routes } from './routes';

export const app: Express = express();

// Render sits behind a reverse proxy — required for correct req.ip / rate limiting.
app.set('trust proxy', 1);

app.use(requestId);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://pub-*.r2.dev'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(generalLimiter);
app.use(requestLogger);

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);
