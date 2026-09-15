import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { connectSocket, getSocket } from './socket';
import { useAuth } from '../store/auth';
import { useWorkspace } from '../store/workspace';
import { useNotifications } from '../store/notifications';
import { useUI } from '../store/ui';

const SocketContext = createContext({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

/**
 * Owns the single app-wide socket: connects on sign-in, re-joins the active
 * workspace room after every reconnect, and routes workspace-level events
 * (presence, notifications, activity) into the stores.
 */
export const SocketProvider = ({ children }) => {
  const token = useAuth((s) => s.token);
  const workspaceId = useWorkspace((s) => s.current?._id);
  const setOnline = useWorkspace((s) => s.setOnline);
  const receive = useNotifications((s) => s.receive);
  const toast = useUI((s) => s.toast);

  const [connected, setConnected] = useState(false);
  const [activity, setActivity] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      // Re-join after a reconnect so the user keeps receiving room events.
      const id = useWorkspace.getState().current?._id;
      if (id) socket.emit('workspace:join', id);
    };
    const onDisconnect = () => setConnected(false);
    const onPresence = (online) => setOnline(online);
    const onNotification = (n) => { receive(n); toast(n.message, 'info'); };
    const onActivity = (a) => setActivity((prev) => [a, ...prev].slice(0, 30));
    const onAuthError = (message) => toast(message, 'error');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('presence:update', onPresence);
    socket.on('notification:new', onNotification);
    socket.on('activity:new', onActivity);
    socket.on('error:auth', onAuthError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence:update', onPresence);
      socket.off('notification:new', onNotification);
      socket.off('activity:new', onActivity);
      socket.off('error:auth', onAuthError);
    };
  }, [token, setOnline, receive, toast]);

  // Join / re-join whenever the active workspace changes.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !workspaceId) return undefined;
    socket.emit('workspace:join', workspaceId);
    setActivity([]);
    return () => socket.emit('workspace:leave', workspaceId);
  }, [workspaceId]);

  const value = useMemo(
    () => ({ socket: socketRef.current, connected, liveActivity: activity }),
    [connected, activity]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
