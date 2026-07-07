import { Router } from 'express';
import * as commentsController from '../controllers/comments.controller';
import * as resourcesController from '../controllers/resources.controller';
import { authenticate, authenticateOptional } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { resourceUpload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  createCategorySchema,
  createResourceSchema,
  listResourcesQuerySchema,
  updateCategorySchema,
  updateResourceSchema,
  uploadResourceFileQuerySchema,
} from '../validators/resource.validator';

// Mounted at /resources
const resourcesRouter = Router();

resourcesRouter.get('/', validate(listResourcesQuerySchema, 'query'), resourcesController.list);
resourcesRouter.post(
  '/',
  authenticate,
  authorize('resource:create'),
  validate(createResourceSchema),
  resourcesController.create,
);
resourcesRouter.get('/:slug', authenticateOptional, resourcesController.getBySlug);
// Ownership vs. resource:edit_any is a mixed check the static authorize()
// middleware can't express — resolved inside ResourceService.update() instead.
resourcesRouter.put(
  '/:slug',
  authenticate,
  validate(updateResourceSchema),
  resourcesController.update,
);
resourcesRouter.delete(
  '/:slug',
  authenticate,
  authorize('resource:delete_own'),
  resourcesController.remove,
);
resourcesRouter.post(
  '/:slug/upload',
  authenticate,
  authorize('resource:upload'),
  validate(uploadResourceFileQuerySchema, 'query'),
  resourceUpload.single('file'),
  resourcesController.uploadFile,
);
resourcesRouter.get(
  '/:slug/download',
  authenticateOptional,
  resourcesController.download,
);
resourcesRouter.post('/:slug/share', authenticateOptional, resourcesController.share);
resourcesRouter.post(
  '/:slug/bookmark',
  authenticate,
  authorize('resource:bookmark'),
  resourcesController.addBookmark,
);
resourcesRouter.delete(
  '/:slug/bookmark',
  authenticate,
  authorize('resource:bookmark'),
  resourcesController.removeBookmark,
);
resourcesRouter.post('/:slug/report', authenticate, resourcesController.report);
resourcesRouter.get('/:slug/comments', commentsController.list);
resourcesRouter.post('/:slug/comments', authenticate, commentsController.create);

// Mounted at /categories — doc 11's Categories API is a top-level prefix, not
// nested under /resources, even though the handlers live alongside resources.
export const categoriesRouter = Router();

categoriesRouter.get('/', resourcesController.listCategories);
categoriesRouter.get('/:slug', resourcesController.getCategoryBySlug);
categoriesRouter.get('/:slug/resources', resourcesController.listCategoryResources);
// Not in doc 11 (read-only there) — added per Phase 4 spec as admin-only
// taxonomy management, gated by the existing admin:manage permission.
categoriesRouter.post(
  '/',
  authenticate,
  authorize('admin:manage'),
  validate(createCategorySchema),
  resourcesController.createCategory,
);
categoriesRouter.put(
  '/:id',
  authenticate,
  authorize('admin:manage'),
  validate(updateCategorySchema),
  resourcesController.updateCategory,
);
categoriesRouter.delete(
  '/:id',
  authenticate,
  authorize('admin:manage'),
  resourcesController.deleteCategory,
);

// Mounted at /tags — same reasoning as categories above.
export const tagsRouter = Router();

tagsRouter.get('/', resourcesController.listTags);
tagsRouter.get('/search', resourcesController.searchTags);
tagsRouter.get('/:slug/resources', resourcesController.listTagResources);

export default resourcesRouter;
