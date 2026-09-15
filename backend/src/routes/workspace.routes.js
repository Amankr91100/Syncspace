import { Router } from 'express';
import { protect, requireWorkspace, requireRole } from '../middleware/auth.js';
import {
  listWorkspaces, createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace,
  inviteMember, myInvites, acceptInvite, removeMember, changeRole,
  getOverview, getActivity, myTasks,
} from '../controllers/workspace.controller.js';

const router = Router();
router.use(protect);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/invites/mine', myInvites);
router.post('/:workspaceId/invites/accept', acceptInvite);

router.get('/:workspaceId', requireWorkspace(), getWorkspace);
router.put('/:workspaceId', requireWorkspace(), requireRole('owner', 'admin'), updateWorkspace);
router.delete('/:workspaceId', requireWorkspace(), requireRole('owner'), deleteWorkspace);

router.post('/:workspaceId/invites', requireWorkspace(), requireRole('owner', 'admin'), inviteMember);
router.delete('/:workspaceId/members/:userId', requireWorkspace(), requireRole('owner', 'admin'), removeMember);
router.put('/:workspaceId/members/:userId/role', requireWorkspace(), requireRole('owner', 'admin'), changeRole);

router.get('/:workspaceId/overview', requireWorkspace(), getOverview);
router.get('/:workspaceId/activity', requireWorkspace(), getActivity);
router.get('/:workspaceId/my-tasks', requireWorkspace(), myTasks);

export default router;
