import List from '../models/List.js';
import Card from '../models/Card.js';
import Board from '../models/Board.js';
import asyncHandler from '../utils/asyncHandler.js';
import { required } from '../utils/validate.js';
import { invalidateBoard } from '../services/board.service.js';
import { logActivity } from '../services/notify.service.js';

const assertBoard = async (req, boardId) => {
  const board = await Board.findById(boardId);
  if (!board || String(board.workspace) !== String(req.workspace._id)) {
    const e = new Error('Board not found in this workspace'); e.status = 404; throw e;
  }
  return board;
};

export const createList = asyncHandler(async (req, res) => {
  required(req.body, ['title', 'boardId']);
  const board = await assertBoard(req, req.body.boardId);

  const count = await List.countDocuments({ board: board._id });
  const list = await List.create({
    title: req.body.title,
    board: board._id,
    workspace: req.workspace._id,
    position: count,
  });

  await invalidateBoard(board._id);
  req.app.get('io').to(`board:${board._id}`).emit('list:created', list);
  res.status(201).json(list);
});

export const updateList = asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.listId);
  if (!list || String(list.workspace) !== String(req.workspace._id)) {
    return res.status(404).json({ message: 'List not found' });
  }
  if (req.body.title) list.title = req.body.title;
  await list.save();

  await invalidateBoard(list.board);
  req.app.get('io').to(`board:${list.board}`).emit('list:updated', list);
  res.json(list);
});

export const deleteList = asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.listId);
  if (!list || String(list.workspace) !== String(req.workspace._id)) {
    return res.status(404).json({ message: 'List not found' });
  }
  await Card.deleteMany({ list: list._id });
  await List.findByIdAndDelete(list._id);

  await invalidateBoard(list.board);
  req.app.get('io').to(`board:${list.board}`).emit('list:deleted', { listId: list._id });
  res.json({ message: 'List deleted' });
});

/** Persist a new list order after a drag. Body: { boardId, order: [listId, ...] } */
export const reorderLists = asyncHandler(async (req, res) => {
  required(req.body, ['boardId', 'order']);
  const board = await assertBoard(req, req.body.boardId);

  await List.bulkWrite(
    req.body.order.map((id, index) => ({
      updateOne: { filter: { _id: id, board: board._id }, update: { $set: { position: index } } },
    }))
  );

  await invalidateBoard(board._id);
  // The mover already applied this optimistically, so only other clients need it.
  req.app.get('io').to(`board:${board._id}`).emit('list:reordered', { order: req.body.order, by: req.user._id });
  await logActivity(req.app.get('io'), {
    workspace: req.workspace._id,
    board: board._id,
    user: req.user._id,
    message: `${req.user.name} reordered the lists on ${board.title}`,
  });
  res.json({ message: 'Order saved' });
});
