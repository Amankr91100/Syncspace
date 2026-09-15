import { Router } from 'express';
import { protect, requireWorkspace } from '../middleware/auth.js';
import { workspaceMembers } from '../controllers/user.controller.js';

const router = Router();
router.get('/workspace/:workspaceId', protect, requireWorkspace(), workspaceMembers);

export default router;
