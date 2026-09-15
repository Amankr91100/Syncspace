import { Router } from 'express';
import { protect, requireWorkspace } from '../middleware/auth.js';
import { createCard, getCard, updateCard, deleteCard, moveCard, toggleChecklistItem } from '../controllers/card.controller.js';

const router = Router();
router.use(protect);
const ws = requireWorkspace((req) => req.query.workspaceId || req.body.workspaceId);

router.post('/', ws, createCard);
router.get('/:cardId', ws, getCard);
router.put('/:cardId', ws, updateCard);
router.delete('/:cardId', ws, deleteCard);
router.put('/:cardId/move', ws, moveCard);
router.put('/:cardId/checklist/:itemId', ws, toggleChecklistItem);

export default router;
