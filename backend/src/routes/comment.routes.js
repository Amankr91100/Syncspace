import { Router } from 'express';
import { protect, requireWorkspace } from '../middleware/auth.js';
import { listComments, createComment, deleteComment } from '../controllers/comment.controller.js';

const router = Router();
router.use(protect);
const ws = requireWorkspace((req) => req.query.workspaceId || req.body.workspaceId);

router.get('/card/:cardId', ws, listComments);
router.post('/', ws, createComment);
router.delete('/:commentId', ws, deleteComment);

export default router;
