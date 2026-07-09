import { Router } from 'express';
import * as searchController from '../controllers/search.controller';
import { authenticateOptional } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { popularSearchesQuerySchema, searchQuerySchema, suggestQuerySchema } from '../validators/search.validator';

const router = Router();

// authenticateOptional — search itself has never required auth, but userId
// (when present) is attached to the SearchLog row for the search that's
// about to run, same as every other "works for anyone, personalizes if
// logged in" endpoint in this codebase (e.g. GET /resources/:slug).
router.get('/', authenticateOptional, validate(searchQuerySchema, 'query'), searchController.search);
router.get('/suggest', validate(suggestQuerySchema, 'query'), searchController.suggest);
router.get('/popular', validate(popularSearchesQuerySchema, 'query'), searchController.popular);
router.get('/filters', searchController.filters);

export default router;
