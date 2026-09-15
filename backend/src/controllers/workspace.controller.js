import Workspace from '../models/Workspace.js';
import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import Document from '../models/Document.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { required, isEmail } from '../utils/validate.js';
import { notify, logActivity } from '../services/notify.service.js';
import { listPresence } from '../config/redis.js';

export const listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await Workspace.find({ 'members.user': req.user._id })
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 });
  res.json(workspaces);
});

export const createWorkspace = asyncHandler(async (req, res) => {
  required(req.body, ['name']);
  const { name, description = '', icon = '🚀' } = req.body;

  const workspace = await Workspace.create({
    name,
    description,
    icon,
    owner: req.user._id,
    members: [{ user: req.user._id, role: 'owner' }],
  });

  await workspace.populate('members.user', 'name email avatar');
  res.status(201).json(workspace);
});

export const getWorkspace = asyncHandler(async (req, res) => {
  await req.workspace.populate('members.user', 'name email avatar title');
  res.json({ workspace: req.workspace, role: req.role });
});

export const updateWorkspace = asyncHandler(async (req, res) => {
  const { name, description, icon } = req.body;
  if (name) req.workspace.name = name;
  if (description !== undefined) req.workspace.description = description;
  if (icon) req.workspace.icon = icon;
  await req.workspace.save();
  await req.workspace.populate('members.user', 'name email avatar');
  res.json(req.workspace);
});

export const deleteWorkspace = asyncHandler(async (req, res) => {
  const id = req.workspace._id;
  if (String(req.workspace.owner) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only the workspace owner can delete it' });
  }
  await Promise.all([
    Card.deleteMany({ workspace: id }),
    List.deleteMany({ workspace: id }),
    Board.deleteMany({ workspace: id }),
    Document.deleteMany({ workspace: id }),
    Activity.deleteMany({ workspace: id }),
    Workspace.findByIdAndDelete(id),
  ]);
  res.json({ message: 'Workspace deleted' });
});

/** Invite by email. Existing users join immediately; others get a pending invite. */
export const inviteMember = asyncHandler(async (req, res) => {
  required(req.body, ['email']);
  const email = String(req.body.email).toLowerCase();
  const role = req.body.role === 'admin' ? 'admin' : 'member';
  if (!isEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });

  const io = req.app.get('io');
  const existing = await User.findOne({ email });

  if (existing) {
    const already = req.workspace.members.some((m) => String(m.user) === String(existing._id));
    if (already) return res.status(409).json({ message: 'That person is already a member' });

    req.workspace.members.push({ user: existing._id, role });
    await req.workspace.save();
    await notify(io, {
      user: existing._id,
      workspace: req.workspace._id,
      type: 'invite',
      message: `${req.user.name} added you to ${req.workspace.name}`,
      link: `/w/${req.workspace._id}`,
    });
  } else {
    if (req.workspace.invites.some((i) => i.email === email)) {
      return res.status(409).json({ message: 'An invite is already pending for that email' });
    }
    req.workspace.invites.push({ email, role, invitedBy: req.user._id });
    await req.workspace.save();
  }

  await req.workspace.populate('members.user', 'name email avatar');
  await logActivity(io, {
    workspace: req.workspace._id,
    user: req.user._id,
    message: `${req.user.name} invited ${email} to the workspace`,
  });
  res.status(201).json(req.workspace);
});

/** Invites waiting for the signed-in user's email address. */
export const myInvites = asyncHandler(async (req, res) => {
  const workspaces = await Workspace.find({ 'invites.email': req.user.email }).select('name icon description invites');
  res.json(workspaces);
});

export const acceptInvite = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.params.workspaceId);
  if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

  const invite = workspace.invites.find((i) => i.email === req.user.email);
  if (!invite) return res.status(404).json({ message: 'No invite found for your account' });

  workspace.members.push({ user: req.user._id, role: invite.role });
  workspace.invites = workspace.invites.filter((i) => i.email !== req.user.email);
  await workspace.save();

  await logActivity(req.app.get('io'), {
    workspace: workspace._id,
    user: req.user._id,
    message: `${req.user.name} joined the workspace`,
  });
  res.json(workspace);
});

export const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (String(req.workspace.owner) === String(userId)) {
    return res.status(400).json({ message: 'The owner cannot be removed' });
  }
  req.workspace.members = req.workspace.members.filter((m) => String(m.user) !== String(userId));
  await req.workspace.save();
  await req.workspace.populate('members.user', 'name email avatar');
  res.json(req.workspace);
});

export const changeRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ message: 'Role must be admin or member' });

  const member = req.workspace.members.find((m) => String(m.user) === String(userId));
  if (!member) return res.status(404).json({ message: 'Member not found' });
  if (member.role === 'owner') return res.status(400).json({ message: "The owner's role cannot change" });

  member.role = role;
  await req.workspace.save();
  await req.workspace.populate('members.user', 'name email avatar');
  res.json(req.workspace);
});

/** Dashboard numbers + recent activity + who is online right now. */
export const getOverview = asyncHandler(async (req, res) => {
  const workspace = req.workspace._id;
  const now = new Date();

  const [total, completed, inProgressLists, overdue, boards, activity, online] = await Promise.all([
    Card.countDocuments({ workspace }),
    Card.countDocuments({ workspace, completed: true }),
    List.find({ workspace, title: /in progress/i }).select('_id').lean(),
    Card.countDocuments({ workspace, completed: false, dueDate: { $ne: null, $lt: now } }),
    Board.find({ workspace }).sort({ updatedAt: -1 }).limit(6).lean(),
    Activity.find({ workspace }).sort({ createdAt: -1 }).limit(12).populate('user', 'name avatar').lean(),
    listPresence(String(workspace)),
  ]);

  const inProgress = inProgressLists.length
    ? await Card.countDocuments({ workspace, list: { $in: inProgressLists.map((l) => l._id) } })
    : 0;

  res.json({
    stats: { total, completed, inProgress, overdue, members: req.workspace.members.length },
    boards,
    activity,
    online,
  });
});

export const getActivity = asyncHandler(async (req, res) => {
  const activity = await Activity.find({ workspace: req.workspace._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('user', 'name avatar');
  res.json(activity);
});

/** Cards assigned to the signed-in user across the workspace. */
export const myTasks = asyncHandler(async (req, res) => {
  const cards = await Card.find({ workspace: req.workspace._id, assignee: req.user._id })
    .sort({ dueDate: 1, updatedAt: -1 })
    .populate('board', 'title')
    .populate('list', 'title')
    .lean();
  res.json(cards);
});
