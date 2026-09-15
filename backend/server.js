import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/db.js';
import { connectRedis } from './src/config/redis.js';
import initSockets from './src/sockets/index.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Socket.io is attached to the same HTTP server so REST and WebSocket
// share one port and one origin.
const io = initSockets(server);
app.set('io', io);

const start = async () => {
  await connectDB();
  await connectRedis();
  server.listen(PORT, () => console.log(`SyncSpace API listening on :${PORT}`));
};

start();

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err.message);
});
