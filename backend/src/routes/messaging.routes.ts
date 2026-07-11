import { Router } from 'express';
import * as messagingController from '../controllers/messaging.controller';
import { authenticate } from '../middleware/authenticate';
import { createRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { sendMessageSchema } from '../validators/messaging.validator';

const router = Router();

// No approval/moderation gate on sending (any user can message any user, per
// product decision) — this cap is the spam control, generous enough for a
// real back-and-forth conversation.
const sendMessageLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 60 });

router.get('/conversations', authenticate, messagingController.listConversations);
router.get('/unread-count', authenticate, messagingController.getUnreadCount);
router.post(
  '/to/:username',
  authenticate,
  sendMessageLimiter,
  validate(sendMessageSchema),
  messagingController.sendMessageToUser,
);
router.get('/conversations/:id/messages', authenticate, messagingController.getMessages);
router.post(
  '/conversations/:id/messages',
  authenticate,
  sendMessageLimiter,
  validate(sendMessageSchema),
  messagingController.sendMessageInConversation,
);
router.post('/conversations/:id/read', authenticate, messagingController.markRead);

export default router;
