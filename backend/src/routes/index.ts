import { Router } from 'express';
import packageJson from '../../package.json';
import { env } from '../config/env';
import { sendSuccess } from '../utils/apiResponse';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import commentsRoutes from './comments.routes';
import notificationsRoutes from './notifications.routes';
import resourcesRoutes, { categoriesRouter, tagsRouter } from './resources.routes';
import searchRoutes from './search.routes';
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
routes.use('/resources', resourcesRoutes);
routes.use('/categories', categoriesRouter);
routes.use('/tags', tagsRouter);
routes.use('/users', usersRoutes);
routes.use('/search', searchRoutes);
routes.use('/comments', commentsRoutes);
routes.use('/notifications', notificationsRoutes);
routes.use('/admin', adminRoutes);
