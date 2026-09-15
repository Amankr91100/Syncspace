import Notification from '../models/Notification.js';
import Card from '../models/Card.js';
import asyncHandler from '../utils/asyncHandler.js';
import { notify } from '../services/notify.service.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const unread = items.filter((n) => !n.read).length;
  res.json({ items, unread });
});

export const markRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ message: 'Marked as read' });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All caught up' });
});

export const clearAll = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });
  res.json({ message: 'Notifications cleared' });
});

/**
 * Checks the caller's assigned tasks for due dates inside the next 24h and
 * raises one notification per task. The client calls this on load, which keeps
 * due-date reminders working without adding a scheduler.
 */
export const checkDueSoon = asyncHandler(async (req, res) => {
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const cards = await Card.find({
    assignee: req.user._id,
    completed: false,
    dueDate: { $ne: null, $lte: soon, $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).select('title workspace board');

  const io = req.app.get('io');
  let created = 0;
  for (const card of cards) {
    const exists = await Notification.findOne({ user: req.user._id, type: 'due', message: new RegExp(card.title, 'i') });
    if (exists) continue;
    await notify(io, {
      user: req.user._id,
      workspace: card.workspace,
      type: 'due',
      message: `${card.title} is due soon`,
      link: `/w/${card.workspace}/b/${card.board}`,
    });
    created += 1;
  }
  res.json({ created });
});
