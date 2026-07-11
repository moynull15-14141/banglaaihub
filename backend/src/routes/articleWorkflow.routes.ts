import { Router } from 'express';
import * as controller from '../controllers/articleWorkflow.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  assignArticleSchema,
  compareRevisionsQuerySchema,
  createEditorialCommentSchema,
  listEditorialCommentsQuerySchema,
  resolveEditorialCommentSchema,
  unassignArticleQuerySchema,
  workflowTransitionSchema,
} from '../validators/articleWorkflow.validator';

// Phase 5A-3 — Editorial Workflow. Mounted at /resources/:slug/... (same
// namespace as 5A-1/5A-2's /publish, /archive) except editorial comments,
// which are deliberately nested under /editorial-comments — a distinct path
// from the existing PUBLIC /resources/:slug/comments (comments.routes.ts) —
// so there is no route-path ambiguity between the two systems.
const router = Router({ mergeParams: true });

// Per-edge permission checks live inside ArticleWorkflowService.transition()
// itself (the graph is permission-gated per edge, not one fixed route-level
// permission) — authenticate is the only route-level guard needed here.
router.post(
  '/:slug/workflow-transition',
  authenticate,
  validate(workflowTransitionSchema),
  controller.transition,
);
router.get('/:slug/workflow-transitions', authenticate, controller.availableTransitions);

router.get('/:slug/assignments', authenticate, controller.listAssignments);
router.post(
  '/:slug/assignments',
  authenticate,
  authorize('content:edit'),
  validate(assignArticleSchema),
  controller.assign,
);
router.delete(
  '/:slug/assignments',
  authenticate,
  authorize('content:edit'),
  validate(unassignArticleQuerySchema, 'query'),
  controller.unassign,
);
router.get('/assigned-to-me', authenticate, controller.listAssignedToMe);

router.get(
  '/:slug/editorial-comments',
  authenticate,
  validate(listEditorialCommentsQuerySchema, 'query'),
  controller.listEditorialComments,
);
router.post(
  '/:slug/editorial-comments',
  authenticate,
  validate(createEditorialCommentSchema),
  controller.createEditorialComment,
);
router.patch(
  '/editorial-comments/:commentId/resolve',
  authenticate,
  validate(resolveEditorialCommentSchema),
  controller.resolveEditorialComment,
);
router.delete('/editorial-comments/:commentId', authenticate, controller.removeEditorialComment);

router.get('/:slug/lock', authenticate, controller.getLockStatus);
router.post('/:slug/lock', authenticate, controller.acquireLock);
router.delete('/:slug/lock', authenticate, controller.releaseLock);
// Force-unlock is admin-only at the route layer (not inside the service) —
// matches the brief's "Force Unlock (Admin only)" requirement directly.
router.delete('/:slug/lock/force', authenticate, authorize('user:manage'), controller.forceReleaseLock);

router.get('/:slug/revisions', authenticate, controller.listRevisions);
router.get(
  '/revisions/:revisionId/compare',
  authenticate,
  validate(compareRevisionsQuerySchema, 'query'),
  controller.compareRevisions,
);
router.post('/revisions/:revisionId/restore', authenticate, authorize('content:edit'), controller.restoreRevision);

export default router;
