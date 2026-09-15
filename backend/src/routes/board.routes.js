import { Router } from 'express';
import { protect, requireWorkspace } from '../middleware/auth.js';
import { listBoards, createBoard, getBoard, updateBoard, deleteBoard, boardActivity } from '../controllers/board.controller.js';

const router = Router();
router.use(protect);

// Workspace id travels as a query param so board routes stay flat.
const ws = requireWorkspace((req) => req.query.workspaceId || req.body.workspaceId);

router.get('/', ws, listBoards);
router.post('/', ws, createBoard);
router.get('/:boardId', ws, getBoard);
router.put('/:boardId', ws, updateBoard);
router.delete('/:boardId', ws, deleteBoard);
router.get('/:boardId/activity', ws, boardActivity);

export default router;
