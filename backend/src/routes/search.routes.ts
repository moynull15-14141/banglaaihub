import { Router } from 'express';
import * as searchController from '../controllers/search.controller';
import { validate } from '../middleware/validate';
import { searchQuerySchema } from '../validators/search.validator';

const router = Router();

router.get('/', validate(searchQuerySchema, 'query'), searchController.search);

export default router;
