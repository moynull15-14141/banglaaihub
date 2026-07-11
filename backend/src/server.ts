import { createServer } from 'node:http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { startScheduledPublishJob, stopScheduledPublishJob } from './jobs/scheduledPublish.job';

const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  startScheduledPublishJob();
});

function shutdown(signal: string): void {
  logger.info(`${signal} received. Shutting down gracefully.`);
  stopScheduledPublishJob();
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  shutdown('SIGINT');
});
