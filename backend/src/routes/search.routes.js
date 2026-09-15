import { Router } from 'express';
import { protect, requireWorkspace } from '../middleware/auth.js';
import { search } from '../controllers/search.controller.js';

const router = Router();
router.get('/', protect, requireWorkspace((req) => req.query.workspaceId), search);

export default router;
