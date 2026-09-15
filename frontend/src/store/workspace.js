import { create } from 'zustand';
import api from '../lib/api';

export const useWorkspace = create((set, get) => ({
  workspaces: [],
  current: null,
  role: 'member',
  members: [],
  online: [],
  loading: true,

  loadWorkspaces: async () => {
    set({ loading: true });
    const { data } = await api.get('/workspaces');
    set({ workspaces: data, loading: false });
    return data;
  },

  selectWorkspace: async (id) => {
    const { data } = await api.get(`/workspaces/${id}`);
    localStorage.setItem('syncspace_workspace', id);
    set({
      current: data.workspace,
      role: data.role,
      members: data.workspace.members || [],
    });
    return data.workspace;
  },

  createWorkspace: async (payload) => {
    const { data } = await api.post('/workspaces', payload);
    set({ workspaces: [data, ...get().workspaces] });
    return data;
  },

  updateWorkspace: async (payload) => {
    const id = get().current._id;
    const { data } = await api.put(`/workspaces/${id}`, payload);
    set({
      current: data,
      workspaces: get().workspaces.map((w) => (w._id === data._id ? data : w)),
    });
    return data;
  },

  deleteWorkspace: async () => {
    const id = get().current._id;
    await api.delete(`/workspaces/${id}`);
    localStorage.removeItem('syncspace_workspace');
    set({ current: null, workspaces: get().workspaces.filter((w) => w._id !== id) });
  },

  invite: async (email, role) => {
    const id = get().current._id;
    const { data } = await api.post(`/workspaces/${id}/invites`, { email, role });
    set({ current: data, members: data.members });
    return data;
  },

  removeMember: async (userId) => {
    const id = get().current._id;
    const { data } = await api.delete(`/workspaces/${id}/members/${userId}`);
    set({ current: data, members: data.members });
  },

  changeRole: async (userId, role) => {
    const id = get().current._id;
    const { data } = await api.put(`/workspaces/${id}/members/${userId}/role`, { role });
    set({ current: data, members: data.members });
  },

  setOnline: (online) => set({ online }),
}));
