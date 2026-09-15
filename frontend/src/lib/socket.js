import { io } from 'socket.io-client';

let socket = null;

/** One shared socket per browser tab, authenticated with the stored JWT. */
export const connectSocket = () => {
  const token = localStorage.getItem('syncspace_token');
  if (!token) return null;

  if (socket?.connected) return socket;
  socket?.disconnect();

  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
