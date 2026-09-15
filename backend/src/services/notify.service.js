import Notification from '../models/Notification.js';
import Activity from '../models/Activity.js';

/** Create a notification and push it straight to that user's personal room. */
export const notify = async (io, { user, workspace, type, message, link = '' }) => {
  if (!user) return null;
  const doc = await Notification.create({ user, workspace, type, message, link });
  io?.to(`user:${user}`).emit('notification:new', doc);
  return doc;
};

/** Record a workspace activity line and broadcast it to the workspace room. */
export const logActivity = async (io, { workspace, board, user, message }) => {
  const doc = await Activity.create({ workspace, board, user, message });
  const populated = await doc.populate('user', 'name avatar');
  io?.to(`workspace:${workspace}`).emit('activity:new', populated);
  return populated;
};
