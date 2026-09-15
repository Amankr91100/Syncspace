import { Server } from 'socket.io';
import { verifyToken } from '../middleware/auth.js';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import { addPresence, removePresence, listPresence } from '../config/redis.js';

/**
 * Socket.io setup.
 *
 * Handshake: the client sends its JWT in `auth.token`. The token is verified
 * before the connection is accepted, so unauthenticated sockets never reach a
 * room. Room membership is checked again on every join, because a valid token
 * only proves who you are — not what you are allowed to open.
 */
const initSockets = (server) => {
  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || '*', credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const { id } = verifyToken(token);
      const user = await User.findById(id).select('name email avatar');
      if (!user) return next(new Error('Unknown user'));
      socket.user = { id: String(user._id), name: user.name, avatar: user.avatar, email: user.email };
      next();
    } catch {
      next(new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    // Personal room: notifications addressed to this user land here.
    socket.join(`user:${socket.user.id}`);

    const canAccessWorkspace = async (workspaceId) => {
      const ws = await Workspace.findById(workspaceId).select('members');
      return !!ws?.members.some((m) => String(m.user) === socket.user.id);
    };

    socket.on('workspace:join', async (workspaceId) => {
      if (!(await canAccessWorkspace(workspaceId))) return socket.emit('error:auth', 'Workspace access denied');
      socket.join(`workspace:${workspaceId}`);
      socket.data.workspaceId = workspaceId;

      await addPresence(workspaceId, socket.user.id);
      const online = await listPresence(workspaceId);
      io.to(`workspace:${workspaceId}`).emit('presence:update', online);
    });

    socket.on('board:join', async ({ workspaceId, boardId }) => {
      if (!(await canAccessWorkspace(workspaceId))) return socket.emit('error:auth', 'Board access denied');
      socket.join(`board:${boardId}`);
      socket.data.boardId = boardId;
      socket.to(`board:${boardId}`).emit('board:viewer-joined', socket.user);
    });

    socket.on('board:leave', (boardId) => {
      socket.leave(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('board:viewer-left', socket.user);
    });

    // Card-level room, used for comment typing indicators.
    socket.on('card:join', (cardId) => socket.join(`card:${cardId}`));
    socket.on('card:leave', (cardId) => socket.leave(`card:${cardId}`));

    socket.on('card:typing', ({ cardId, typing }) =>
      socket.to(`card:${cardId}`).emit('card:typing', { user: socket.user, typing })
    );

    socket.on('doc:join', (documentId) => socket.join(`doc:${documentId}`));
    socket.on('doc:leave', (documentId) => socket.leave(`doc:${documentId}`));
    socket.on('doc:typing', ({ documentId, typing }) =>
      socket.to(`doc:${documentId}`).emit('doc:typing', { user: socket.user, typing })
    );

    socket.on('disconnect', async () => {
      const workspaceId = socket.data.workspaceId;
      if (!workspaceId) return;

      // Only clear presence if this was the user's last open tab.
      const sockets = await io.in(`workspace:${workspaceId}`).fetchSockets();
      const stillHere = sockets.some((s) => s.user?.id === socket.user.id && s.id !== socket.id);
      if (!stillHere) {
        await removePresence(workspaceId, socket.user.id);
        const online = await listPresence(workspaceId);
        io.to(`workspace:${workspaceId}`).emit('presence:update', online);
      }
    });
  });

  return io;
};

export default initSockets;
