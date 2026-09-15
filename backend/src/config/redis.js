import Redis from 'ioredis';

let client = null;
let ready = false;

/**
 * Redis is treated as an optional accelerator. If it is unreachable the API
 * still works — every cache helper simply becomes a no-op.
 */
export const connectRedis = async () => {
  const url = process.env.REDIS_URL;
  if (!url) return console.log('Redis disabled (no REDIS_URL)');

  client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null });
  client.on('error', () => { ready = false; });
  try {
    await client.connect();
    ready = true;
    console.log('Redis connected');
  } catch {
    ready = false;
    console.log('Redis unavailable — running without cache');
  }
};

export const getClient = () => (ready ? client : null);

export const cacheGet = async (key) => {
  const c = getClient();
  if (!c) return null;
  try {
    const raw = await c.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const cacheSet = async (key, value, ttl = 60) => {
  const c = getClient();
  if (!c) return;
  try { await c.set(key, JSON.stringify(value), 'EX', ttl); } catch { /* ignore */ }
};

/** Drop cache entries (called on any mutation that invalidates them). */
export const cacheDel = async (...keys) => {
  const c = getClient();
  if (!c || !keys.length) return;
  try { await c.del(...keys); } catch { /* ignore */ }
};

/* ---- presence: who is online, stored as a redis set per workspace ---- */
export const addPresence = async (workspaceId, userId) => {
  const c = getClient();
  if (!c) return;
  try { await c.sadd(`presence:${workspaceId}`, String(userId)); } catch { /* ignore */ }
};

export const removePresence = async (workspaceId, userId) => {
  const c = getClient();
  if (!c) return;
  try { await c.srem(`presence:${workspaceId}`, String(userId)); } catch { /* ignore */ }
};

export const listPresence = async (workspaceId) => {
  const c = getClient();
  if (!c) return [];
  try { return await c.smembers(`presence:${workspaceId}`); } catch { return []; }
};
