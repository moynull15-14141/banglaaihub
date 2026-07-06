import winston from 'winston';
import { env } from './env';

const { combine, timestamp, printf, colorize, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp(),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${String(ts)} [${level}] ${String(message)}${metaString}`;
  }),
);

const prodFormat = combine(timestamp(), json());

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});
