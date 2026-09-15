import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';

export const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

/** Requires a valid `Authorization: Bearer <token>` header. */
export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Sign in to continue' });

    const { id } = verifyToken(header.split(' ')[1]);
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ message: 'Account no longer exists' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Sign in again.' });
  }
};

/**
 * Confirms the signed-in user belongs to the workspace and attaches
 * `req.workspace` plus `req.role`. Every workspace-scoped route uses this,
 * which is what keeps workspaces isolated from one another.
 */
export const requireWorkspace = (getId = (req) => req.params.workspaceId) => async (req, res, next) => {
  try {
    const workspaceId = getId(req);
    if (!workspaceId) return res.status(400).json({ message: 'Workspace is required' });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const member = workspace.members.find((m) => String(m.user) === String(req.user._id));
    if (!member) return res.status(403).json({ message: 'You do not have access to this workspace' });

    req.workspace = workspace;
    req.role = member.role;
    next();
  } catch (err) {
    next(err);
  }
};

/** Restricts an action to workspace owners/admins. */
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.role)) return res.status(403).json({ message: 'Your role cannot do that' });
  next();
};
