import { Router } from 'express';
import * as commentsController from '../controllers/comments.controller';
import * as resourcesController from '../controllers/resources.controller';
import { authenticate } from '../middleware/authenticate';
import { upload } from '../middleware/upload';

// Mounted at /resources
const resourcesRouter = Router();

resourcesRouter.get('/', resourcesController.list);
resourcesRouter.post('/', authenticate, resourcesController.create);
resourcesRouter.get('/:slug', resourcesController.getBySlug);
resourcesRouter.put('/:slug', authenticate, resourcesController.update);
resourcesRouter.delete('/:slug', authenticate, resourcesController.remove);
resourcesRouter.post(
  '/:slug/upload',
  authenticate,
  upload.single('file'),
  resourcesController.uploadFile,
);
resourcesRouter.post('/:slug/bookmark', authenticate, resourcesController.addBookmark);
resourcesRouter.delete('/:slug/bookmark', authenticate, resourcesController.removeBookmark);
resourcesRouter.post('/:slug/report', authenticate, resourcesController.report);
resourcesRouter.get('/:slug/comments', commentsController.list);
resourcesRouter.post('/:slug/comments', authenticate, commentsController.create);

// Mounted at /categories — doc 11's Categories API is a top-level prefix, not
// nested under /resources, even though the handlers live alongside resources.
export const categoriesRouter = Router();

categoriesRouter.get('/', resourcesController.listCategories);
categoriesRouter.get('/:slug', resourcesController.getCategoryBySlug);
categoriesRouter.get('/:slug/resources', resourcesController.listCategoryResources);

// Mounted at /tags — same reasoning as categories above.
export const tagsRouter = Router();

tagsRouter.get('/', resourcesController.listTags);
tagsRouter.get('/search', resourcesController.searchTags);
tagsRouter.get('/:slug/resources', resourcesController.listTagResources);

export default resourcesRouter;
