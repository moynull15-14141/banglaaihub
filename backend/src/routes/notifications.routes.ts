import { Router } from 'express';
import * as notificationsController from '../controllers/notifications.controller';
import { authenticate } from '../middleware/authenticate';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// No file-specific line in doc 13's rate-limiting table — dedicated instance
// of the doc's "All other GET" default (300/min/IP), same values as
// rateLimiter.ts's generalLimiter, kept as its own instance so this file
// still has a defined ceiling if the app-wide blanket limiter ever changes.
router.use(createRateLimiter({ windowMs: 60 * 1000, max: 300 }));

router.get('/', authenticate, notificationsController.list);
router.patch('/read-all', authenticate, notificationsController.markAllRead);
router.patch('/:id/read', authenticate, notificationsController.markRead);
router.delete('/:id', authenticate, notificationsController.remove);

export default router;
