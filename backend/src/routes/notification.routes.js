import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { listNotifications, markRead, markAllRead, clearAll, checkDueSoon } from '../controllers/notification.controller.js';

const router = Router();
router.use(protect);

router.get('/', listNotifications);
router.post('/read-all', markAllRead);
router.post('/due-check', checkDueSoon);
router.delete('/', clearAll);
router.put('/:id/read', markRead);

export default router;
