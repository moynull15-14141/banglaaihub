import type { Request } from 'express';
import morgan from 'morgan';
import { logger } from '../config/logger';

morgan.token('id', (req: Request) => req.id ?? '-');

export const requestLogger = morgan(
  ':id :method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  },
);
