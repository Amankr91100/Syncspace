import Comment from '../models/Comment.js';
import Card from '../models/Card.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { required } from '../utils/validate.js';
import { notify, logActivity } from '../services/notify.service.js';

export const listComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ card: req.params.cardId })
    .sort({ createdAt: 1 })
    .populate('author', 'name avatar');
  res.json(comments);
});

export const createComment = asyncHandler(async (req, res) => {
  required(req.body, ['text', 'cardId']);
  const card = await Card.findById(req.body.cardId);
  if (!card || String(card.workspace) !== String(req.workspace._id)) {
    return res.status(404).json({ message: 'Card not found' });
  }

  // @mentions are matched against workspace members by name.
  const names = [...String(req.body.text).matchAll(/@([\w.-]+)/g)].map((m) => m[1].toLowerCase());
  const mentioned = names.length
    ? await User.find({
        _id: { $in: req.workspace.members.map((m) => m.user) },
        $expr: { $in: [{ $toLower: { $replaceAll: { input: '$name', find: ' ', replacement: '' } } }, names] },
      }).select('_id name')
    : [];

  const comment = await Comment.create({
    text: req.body.text,
    card: card._id,
    board: card.board,
    workspace: req.workspace._id,
    author: req.user._id,
    mentions: mentioned.map((u) => u._id),
  });
  const full = await comment.populate('author', 'name avatar');

  const io = req.app.get('io');
  io.to(`card:${card._id}`).emit('comment:created', full);
  io.to(`board:${card.board}`).emit('card:comment-count', { cardId: card._id });

  await logActivity(io, {
    workspace: req.workspace._id,
    board: card.board,
    user: req.user._id,
    message: `${req.user.name} commented on ${card.title}`,
  });

  const link = `/w/${req.workspace._id}/b/${card.board}`;
  if (card.assignee && String(card.assignee) !== String(req.user._id)) {
    await notify(io, { user: card.assignee, workspace: req.workspace._id, type: 'comment', message: `${req.user.name} commented on ${card.title}`, link });
  }
  for (const u of mentioned) {
    if (String(u._id) === String(req.user._id)) continue;
    await notify(io, { user: u._id, workspace: req.workspace._id, type: 'mention', message: `${req.user.name} mentioned you on ${card.title}`, link });
  }

  res.status(201).json(full);
});

export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment || String(comment.workspace) !== String(req.workspace._id)) {
    return res.status(404).json({ message: 'Comment not found' });
  }
  if (String(comment.author) !== String(req.user._id) && req.role === 'member') {
    return res.status(403).json({ message: 'You can only delete your own comments' });
  }
  await Comment.findByIdAndDelete(comment._id);
  req.app.get('io').to(`card:${comment.card}`).emit('comment:deleted', { commentId: comment._id });
  res.json({ message: 'Comment deleted' });
});
