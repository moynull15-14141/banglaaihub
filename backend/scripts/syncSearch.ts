import { SearchService } from '../src/services/search.service';
import { prisma } from '../src/config/database';
import { logger } from '../src/config/logger';

async function main(): Promise<void> {
  logger.info('Configuring MeiliSearch index settings...');
  await SearchService.configureIndex();

  logger.info('Rebuilding search index from approved resources...');
  const { count } = await SearchService.rebuildIndex();

  logger.info(`Search index rebuilt with ${count} approved resource(s).`);
}

main()
  .catch((error: unknown) => {
    logger.error('Search sync failed', { error });
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
