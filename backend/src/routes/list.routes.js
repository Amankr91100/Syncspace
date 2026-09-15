import { Router } from 'express';
import { protect, requireWorkspace } from '../middleware/auth.js';
import { createList, updateList, deleteList, reorderLists } from '../controllers/list.controller.js';

const router = Router();
router.use(protect);
const ws = requireWorkspace((req) => req.query.workspaceId || req.body.workspaceId);

router.post('/', ws, createList);
router.put('/reorder', ws, reorderLists);
router.put('/:listId', ws, updateList);
router.delete('/:listId', ws, deleteList);

export default router;
