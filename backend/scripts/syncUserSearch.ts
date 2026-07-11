import { UserSearchService } from '../src/services/user-search.service';
import { prisma } from '../src/config/database';
import { logger } from '../src/config/logger';

async function main(): Promise<void> {
  logger.info('Configuring MeiliSearch users index settings...');
  await UserSearchService.configureIndex();

  logger.info('Rebuilding user search index from active users...');
  const { count } = await UserSearchService.rebuildIndex();

  logger.info(`User search index rebuilt with ${count} user(s).`);
}

main()
  .catch((error: unknown) => {
    logger.error('User search sync failed', { error });
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
