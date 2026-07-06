import { Router } from 'express';
import * as commentsController from '../controllers/comments.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.put('/:id', authenticate, commentsController.update);
router.delete('/:id', authenticate, commentsController.remove);
router.post('/:id/upvote', authenticate, commentsController.upvote);

export default router;
