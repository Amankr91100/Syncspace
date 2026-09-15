import List from '../models/List.js';
import Card from '../models/Card.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';

export const boardCacheKey = (boardId) => `board:${boardId}:data`;

/** Read a board's lists + cards, served from Redis when it is warm. */
export const getBoardData = async (boardId) => {
  const key = boardCacheKey(boardId);
  const cached = await cacheGet(key);
  if (cached) return cached;

  const [lists, cards] = await Promise.all([
    List.find({ board: boardId }).sort({ position: 1 }).lean(),
    Card.find({ board: boardId })
      .sort({ position: 1 })
      .populate('assignee', 'name avatar email')
      .lean(),
  ]);

  const data = { lists, cards };
  await cacheSet(key, data, 60);
  return data;
};

export const invalidateBoard = (boardId) => cacheDel(boardCacheKey(boardId));
