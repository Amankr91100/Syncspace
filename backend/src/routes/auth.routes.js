import { Router } from 'express';
import { register, login, me, updateProfile } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.put('/me', protect, updateProfile);
// Logout is client-side (the JWT is simply discarded); the route exists for symmetry.
router.post('/logout', protect, (req, res) => res.json({ message: 'Signed out' }));

export default router;
