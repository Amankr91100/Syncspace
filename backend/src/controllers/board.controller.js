import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import Comment from '../models/Comment.js';
import Activity from '../models/Activity.js';
import asyncHandler from '../utils/asyncHandler.js';
import { required } from '../utils/validate.js';
import { getBoardData, invalidateBoard } from '../services/board.service.js';
import { logActivity } from '../services/notify.service.js';

const DEFAULT_LISTS = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];

export const listBoards = asyncHandler(async (req, res) => {
  const boards = await Board.find({ workspace: req.workspace._id }).sort({ updatedAt: -1 }).lean();

  // Attach a card count per board so the grid can show progress without N queries.
  const counts = await Card.aggregate([
    { $match: { workspace: req.workspace._id } },
    { $group: { _id: '$board', total: { $sum: 1 }, done: { $sum: { $cond: ['$completed', 1, 0] } } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c]));

  res.json(boards.map((b) => ({ ...b, cardCount: map[String(b._id)]?.total || 0, doneCount: map[String(b._id)]?.done || 0 })));
});

export const createBoard = asyncHandler(async (req, res) => {
  required(req.body, ['title']);
  const { title, description = '', theme = 'violet' } = req.body;

  const board = await Board.create({
    title,
    description,
    theme,
    workspace: req.workspace._id,
    createdBy: req.user._id,
    members: [req.user._id],
  });

  // Seed the five default Agile lists.
  await List.insertMany(
    DEFAULT_LISTS.map((t, i) => ({ title: t, board: board._id, workspace: req.workspace._id, position: i }))
  );

  const io = req.app.get('io');
  io.to(`workspace:${req.workspace._id}`).emit('board:created', board);
  await logActivity(io, {
    workspace: req.workspace._id,
    board: board._id,
    user: req.user._id,
    message: `${req.user.name} created the board ${board.title}`,
  });

  res.status(201).json(board);
});

const loadBoard = async (req) => {
  const board = await Board.findById(req.params.boardId);
  if (!board) { const e = new Error('Board not found'); e.status = 404; throw e; }
  if (String(board.workspace) !== String(req.workspace._id)) {
    const e = new Error('That board belongs to another workspace'); e.status = 403; throw e;
  }
  return board;
};

export const getBoard = asyncHandler(async (req, res) => {
  const board = await loadBoard(req);
  const { lists, cards } = await getBoardData(board._id);
  res.json({ board, lists, cards });
});

export const updateBoard = asyncHandler(async (req, res) => {
  const board = await loadBoard(req);
  const { title, description, theme } = req.body;
  if (title) board.title = title;
  if (description !== undefined) board.description = description;
  if (theme) board.theme = theme;
  await board.save();

  req.app.get('io').to(`board:${board._id}`).emit('board:updated', board);
  res.json(board);
});

export const deleteBoard = asyncHandler(async (req, res) => {
  const board = await loadBoard(req);
  await Promise.all([
    Card.deleteMany({ board: board._id }),
    List.deleteMany({ board: board._id }),
    Comment.deleteMany({ board: board._id }),
    Activity.deleteMany({ board: board._id }),
    Board.findByIdAndDelete(board._id),
  ]);
  await invalidateBoard(board._id);

  req.app.get('io').to(`workspace:${req.workspace._id}`).emit('board:deleted', { boardId: board._id });
  res.json({ message: 'Board deleted' });
});

export const boardActivity = asyncHandler(async (req, res) => {
  const activity = await Activity.find({ board: req.params.boardId })
    .sort({ createdAt: -1 })
    .limit(40)
    .populate('user', 'name avatar');
  res.json(activity);
});
