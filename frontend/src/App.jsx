import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Toaster from './components/Toaster';
import ConfirmDialog from './components/ConfirmDialog';
import { SocketProvider } from './lib/SocketContext';
import { useUI } from './store/ui';
import { useAuth } from './store/auth';
import { connectSocket } from './lib/socket';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Workspaces from './pages/Workspaces';
import Dashboard from './pages/Dashboard';
import Boards from './pages/Boards';
import BoardPage from './pages/BoardPage';
import MyTasks from './pages/MyTasks';
import Documents from './pages/Documents';
import DocumentEditor from './pages/DocumentEditor';
import Team from './pages/Team';
import NotificationsPage from './pages/NotificationsPage';
import WorkspaceSettings from './pages/WorkspaceSettings';
import Profile from './pages/Profile';

export default function App() {
  const applyTheme = useUI((s) => s.applyTheme);
  const token = useAuth((s) => s.token);

  useEffect(() => { applyTheme(); }, [applyTheme]);
  useEffect(() => { if (token) connectSocket(); }, [token]);

  return (
    <SocketProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/workspaces" element={<ProtectedRoute><Workspaces /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        <Route path="/w/:workspaceId" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="boards" element={<Boards />} />
          <Route path="b/:boardId" element={<BoardPage />} />
          <Route path="my-tasks" element={<MyTasks />} />
          <Route path="documents" element={<Documents />} />
          <Route path="d/:documentId" element={<DocumentEditor />} />
          <Route path="team" element={<Team />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<WorkspaceSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
      <ConfirmDialog />
    </SocketProvider>
  );
}
