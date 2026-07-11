import { Router } from 'express';
import packageJson from '../../package.json';
import { env } from '../config/env';
import { sendSuccess } from '../utils/apiResponse';
import adminRoutes from './admin.routes';
import articleWorkflowRoutes from './articleWorkflow.routes';
import authRoutes from './auth.routes';
import commentsRoutes from './comments.routes';
import contributorApplicationsRoutes from './contributor-applications.routes';
import feedRoutes from './feed.routes';
import messagingRoutes from './messaging.routes';
import notificationsRoutes from './notifications.routes';
import postsRoutes from './posts.routes';
import resourcesRoutes, { categoriesRouter, tagsRouter } from './resources.routes';
import reviewsRoutes from './reviews.routes';
import searchRoutes from './search.routes';
import seoRoutes from './seo.routes';
import usersRoutes from './users.routes';

export const routes = Router();

routes.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: packageJson.version,
    environment: env.NODE_ENV,
  });
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
routes.use('/contributor-applications', contributorApplicationsRoutes);
routes.use('/seo', seoRoutes);
routes.use('/admin', adminRoutes);
