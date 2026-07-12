import { Router } from 'express';
import packageJson from '../../package.json';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { sendError, sendSuccess } from '../utils/apiResponse';
import adminRoutes from './admin.routes';
import articleWorkflowRoutes from './articleWorkflow.routes';
import authRoutes from './auth.routes';
import commentsRoutes from './comments.routes';
import contributorApplicationsRoutes from './contributor-applications.routes';
import feedRoutes from './feed.routes';
import messagingRoutes from './messaging.routes';
import notificationsRoutes from './notifications.routes';
import paymentsRoutes from './payments.routes';
import postsRoutes from './posts.routes';
import resourcesRoutes, { categoriesRouter, tagsRouter } from './resources.routes';
import reviewsRoutes from './reviews.routes';
import searchRoutes from './search.routes';
import seoRoutes from './seo.routes';
import siteFontsRoutes from './siteFonts.routes';
import statCardImagesRoutes from './statCardImages.routes';
import usersRoutes from './users.routes';

export const routes = Router();

// Pure liveness — "is the process up," no external dependency touched, so
// this never fails just because the DB or a downstream service is slow.
routes.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: packageJson.version,
    environment: env.NODE_ENV,
  });
});

// Readiness — "is this instance actually able to serve real requests."
// Render's health check only exercises /health, which stays green even if
// DATABASE_URL is wrong or the DB is unreachable (every real request would
// still 500). Point Render's health-check path at this one instead so a
// broken DB connection blocks the deploy / pulls the instance out of
// rotation, rather than passing a check that proves nothing.
routes.get('/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, { status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Readiness check failed — database unreachable.', { error });
    sendError(res, 503, 'NOT_READY', 'Database is unreachable.');
  }
});

routes.use('/auth', authRoutes);
// Mounted BEFORE resourcesRoutes — articleWorkflowRoutes has a few flat
// (non-:slug-nested) paths like /resources/assigned-to-me that would
// otherwise be shadowed by resourcesRoutes' GET /:slug if that router saw
// the request first.
routes.use('/resources', articleWorkflowRoutes);
routes.use('/resources', resourcesRoutes);
routes.use('/categories', categoriesRouter);
routes.use('/tags', tagsRouter);
routes.use('/users', usersRoutes);
routes.use('/search', searchRoutes);
routes.use('/comments', commentsRoutes);
routes.use('/feed', feedRoutes);
routes.use('/messages', messagingRoutes);
routes.use('/posts', postsRoutes);
routes.use('/reviews', reviewsRoutes);
routes.use('/notifications', notificationsRoutes);
routes.use('/payments', paymentsRoutes);
routes.use('/contributor-applications', contributorApplicationsRoutes);
routes.use('/seo', seoRoutes);
routes.use('/site-settings/fonts', siteFontsRoutes);
routes.use('/site-settings/stat-cards', statCardImagesRoutes);
routes.use('/admin', adminRoutes);
