import Card from '../models/Card.js';
import Board from '../models/Board.js';
import List from '../models/List.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { cacheGet, cacheSet } from '../config/redis.js';

/**
 * Workspace-wide search across cards, boards, lists, documents and members.
 * Supports ?q= plus optional priority / assignee / status filters.
 * Results are cached briefly since the same query is often re-run as the user types.
 */
export const search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { priority, assignee, status } = req.query;
  const workspace = req.workspace._id;

  if (!q && !priority && !assignee && !status) {
    return res.json({ cards: [], boards: [], lists: [], documents: [], members: [] });
  }

  const key = `search:${workspace}:${q}:${priority || ''}:${assignee || ''}:${status || ''}`;
  const cached = await cacheGet(key);
  if (cached) return res.json(cached);

  const rx = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

  const cardQuery = { workspace };
  if (rx) cardQuery.$or = [{ title: rx }, { description: rx }, { labels: rx }];
  if (priority) cardQuery.priority = priority;
  if (assignee) cardQuery.assignee = assignee;
  if (status === 'completed') cardQuery.completed = true;
  if (status === 'open') cardQuery.completed = false;

  const memberIds = req.workspace.members.map((m) => m.user);

  const [cards, boards, lists, documents, members] = await Promise.all([
    Card.find(cardQuery).limit(20).populate('assignee', 'name avatar').populate('board', 'title').populate('list', 'title').lean(),
    rx ? Board.find({ workspace, $or: [{ title: rx }, { description: rx }] }).limit(10).lean() : [],
    rx ? List.find({ workspace, title: rx }).limit(10).populate('board', 'title').lean() : [],
    rx ? Document.find({ workspace, $or: [{ title: rx }, { content: rx }] }).limit(10).select('title updatedAt').lean() : [],
    rx ? User.find({ _id: { $in: memberIds }, $or: [{ name: rx }, { email: rx }] }).limit(10).select('name email avatar').lean() : [],
  ]);

  const payload = { cards, boards, lists, documents, members };
  await cacheSet(key, payload, 30);
  res.json(payload);
});
