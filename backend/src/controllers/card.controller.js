import Card from '../models/Card.js';
import List from '../models/List.js';
import Comment from '../models/Comment.js';
import asyncHandler from '../utils/asyncHandler.js';
import { required } from '../utils/validate.js';
import { invalidateBoard } from '../services/board.service.js';
import { notify, logActivity } from '../services/notify.service.js';

const populateCard = (q) => q.populate('assignee', 'name avatar email').populate('createdBy', 'name avatar');

const loadCard = async (req) => {
  const card = await Card.findById(req.params.cardId);
  if (!card || String(card.workspace) !== String(req.workspace._id)) {
    const e = new Error('Card not found'); e.status = 404; throw e;
  }
  return card;
};

export const createCard = asyncHandler(async (req, res) => {
  required(req.body, ['title', 'listId']);
  const list = await List.findById(req.body.listId);
  if (!list || String(list.workspace) !== String(req.workspace._id)) {
    return res.status(404).json({ message: 'List not found' });
  }

  const count = await Card.countDocuments({ list: list._id });
  const card = await Card.create({
    title: req.body.title,
    description: req.body.description || '',
    list: list._id,
    board: list.board,
    workspace: req.workspace._id,
    position: count,
    priority: req.body.priority || 'medium',
    assignee: req.body.assignee || null,
    dueDate: req.body.dueDate || null,
    labels: req.body.labels || [],
    createdBy: req.user._id,
    activity: [{ message: `${req.user.name} created this task`, user: req.user._id }],
  });

  await populateCard(Card.findById(card._id)).then((c) => card.set(c));
  const full = await populateCard(Card.findById(card._id));

  await invalidateBoard(list.board);
  const io = req.app.get('io');
  io.to(`board:${list.board}`).emit('card:created', full);
  await logActivity(io, {
    workspace: req.workspace._id,
    board: list.board,
    user: req.user._id,
    message: `${req.user.name} added ${card.title} to ${list.title}`,
  });

  if (card.assignee && String(card.assignee) !== String(req.user._id)) {
    await notify(io, {
      user: card.assignee,
      workspace: req.workspace._id,
      type: 'assigned',
      message: `${req.user.name} assigned you ${card.title}`,
      link: `/w/${req.workspace._id}/b/${list.board}`,
    });
  }

  res.status(201).json(full);
});

export const getCard = asyncHandler(async (req, res) => {
  const card = await loadCard(req);
  const [full, comments] = await Promise.all([
    populateCard(Card.findById(card._id)).populate('activity.user', 'name avatar'),
    Comment.find({ card: card._id }).sort({ createdAt: 1 }).populate('author', 'name avatar'),
  ]);
  res.json({ card: full, comments });
});

export const updateCard = asyncHandler(async (req, res) => {
  const card = await loadCard(req);
  const before = { assignee: String(card.assignee || ''), title: card.title };

  const fields = ['title', 'description', 'priority', 'dueDate', 'labels', 'checklist', 'attachments', 'completed', 'assignee'];
  fields.forEach((f) => { if (req.body[f] !== undefined) card[f] = req.body[f]; });

  if (req.body.assignee !== undefined && String(req.body.assignee || '') !== before.assignee) {
    card.activity.push({ message: `${req.user.name} changed the assignee`, user: req.user._id });
  }
  await card.save();

  const full = await populateCard(Card.findById(card._id)).populate('activity.user', 'name avatar');
  await invalidateBoard(card.board);

  const io = req.app.get('io');
  io.to(`board:${card.board}`).emit('card:updated', full);
  io.to(`card:${card._id}`).emit('card:detail-updated', full);

  if (card.assignee && String(card.assignee) !== before.assignee && String(card.assignee) !== String(req.user._id)) {
    await notify(io, {
      user: card.assignee,
      workspace: req.workspace._id,
      type: 'assigned',
      message: `${req.user.name} assigned you ${card.title}`,
      link: `/w/${req.workspace._id}/b/${card.board}`,
    });
  }
  res.json(full);
});

export const deleteCard = asyncHandler(async (req, res) => {
  const card = await loadCard(req);
  await Comment.deleteMany({ card: card._id });
  await Card.findByIdAndDelete(card._id);
  await invalidateBoard(card.board);

  req.app.get('io').to(`board:${card.board}`).emit('card:deleted', { cardId: card._id, listId: card.list });
  res.json({ message: 'Task deleted' });
});

/**
 * Move a card between lists / positions.
 * Body: { toListId, position }
 * Positions are rewritten for both affected lists so the order stays dense
 * and consistent for every client that reloads the board.
 */
export const moveCard = asyncHandler(async (req, res) => {
  required(req.body, ['toListId']);
  const card = await loadCard(req);

  const target = await List.findById(req.body.toListId);
  if (!target || String(target.board) !== String(card.board)) {
    return res.status(400).json({ message: 'Target list is not on this board' });
  }

  const fromListId = String(card.list);
  const position = Number(req.body.position ?? 0);
  const fromList = await List.findById(fromListId);

  card.list = target._id;
  card.completed = /done/i.test(target.title);
  card.activity.push({ message: `${req.user.name} moved this to ${target.title}`, user: req.user._id });
  await card.save();

  const resequence = async (listId) => {
    const cards = await Card.find({ list: listId }).sort({ position: 1 }).select('_id');
    let ids = cards.map((c) => String(c._id));
    if (String(listId) === String(target._id)) {
      ids = ids.filter((id) => id !== String(card._id));
      ids.splice(Math.max(0, Math.min(position, ids.length)), 0, String(card._id));
    }
    await Card.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { position: i } } } })));
  };

  await resequence(target._id);
  if (fromListId !== String(target._id)) await resequence(fromListId);

  await invalidateBoard(card.board);
  const full = await populateCard(Card.findById(card._id));

  const io = req.app.get('io');
  io.to(`board:${card.board}`).emit('card:moved', {
    card: full,
    fromListId,
    toListId: String(target._id),
    position,
    by: String(req.user._id),
  });

  if (fromListId !== String(target._id)) {
    await logActivity(io, {
      workspace: req.workspace._id,
      board: card.board,
      user: req.user._id,
      message: `${req.user.name} moved ${card.title} from ${fromList?.title || 'a list'} to ${target.title}`,
    });
  }
  res.json(full);
});

export const toggleChecklistItem = asyncHandler(async (req, res) => {
  const card = await loadCard(req);
  const item = card.checklist.id(req.params.itemId);
  if (!item) return res.status(404).json({ message: 'Checklist item not found' });

  item.done = !item.done;
  await card.save();
  await invalidateBoard(card.board);

  const full = await populateCard(Card.findById(card._id));
  const io = req.app.get('io');
  io.to(`board:${card.board}`).emit('card:updated', full);
  io.to(`card:${card._id}`).emit('card:detail-updated', full);
  res.json(full);
});
