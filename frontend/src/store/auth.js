import { create } from 'zustand';
import api from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

const savedUser = (() => {
  try { return JSON.parse(localStorage.getItem('syncspace_user')); } catch { return null; }
})();

export const useAuth = create((set) => ({
  user: savedUser,
  token: localStorage.getItem('syncspace_token'),
  loading: false,

  setSession: (user, token) => {
    localStorage.setItem('syncspace_token', token);
    localStorage.setItem('syncspace_user', JSON.stringify(user));
    connectSocket();
    set({ user, token });
  },

  register: async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    useAuth.getState().setSession(data.user, data.token);
    return data.user;
  },

  login: async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    useAuth.getState().setSession(data.user, data.token);
    return data.user;
  },

  refresh: async () => {
    const { data } = await api.get('/auth/me');
    localStorage.setItem('syncspace_user', JSON.stringify(data.user));
    set({ user: data.user });
  },

  updateProfile: async (payload) => {
    const { data } = await api.put('/auth/me', payload);
    localStorage.setItem('syncspace_user', JSON.stringify(data.user));
    set({ user: data.user });
    return data.user;
  },

  logout: () => {
    disconnectSocket();
    localStorage.removeItem('syncspace_token');
    localStorage.removeItem('syncspace_user');
    localStorage.removeItem('syncspace_workspace');
    set({ user: null, token: null });
  },
}));
