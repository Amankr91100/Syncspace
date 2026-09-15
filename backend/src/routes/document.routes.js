import { Router } from 'express';
import { protect, requireWorkspace } from '../middleware/auth.js';
import { listDocuments, createDocument, getDocument, updateDocument, deleteDocument } from '../controllers/document.controller.js';

const router = Router();
router.use(protect);
const ws = requireWorkspace((req) => req.query.workspaceId || req.body.workspaceId);

router.get('/', ws, listDocuments);
router.post('/', ws, createDocument);
router.get('/:documentId', ws, getDocument);
router.put('/:documentId', ws, updateDocument);
router.delete('/:documentId', ws, deleteDocument);

export default router;
