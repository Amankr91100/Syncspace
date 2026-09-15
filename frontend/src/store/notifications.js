import { create } from 'zustand';
import api from '../lib/api';

export const useNotifications = create((set, get) => ({
  items: [],
  unread: 0,

  load: async () => {
    const { data } = await api.get('/notifications');
    set({ items: data.items, unread: data.unread });
  },

  receive: (item) => set({ items: [item, ...get().items], unread: get().unread + 1 }),

  markRead: async (id) => {
    set({
      items: get().items.map((n) => (n._id === id ? { ...n, read: true } : n)),
      unread: Math.max(0, get().unread - 1),
    });
    await api.put(`/notifications/${id}/read`);
  },

  markAllRead: async () => {
    set({ items: get().items.map((n) => ({ ...n, read: true })), unread: 0 });
    await api.post('/notifications/read-all');
  },

  clearAll: async () => {
    set({ items: [], unread: 0 });
    await api.delete('/notifications');
  },

  checkDueSoon: async () => {
    const { data } = await api.post('/notifications/due-check');
    if (data.created) get().load();
  },
}));
