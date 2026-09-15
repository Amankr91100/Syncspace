import { create } from 'zustand';
import api from '../lib/api';

/**
 * Board state.
 *
 * Every mutation follows the same shape: change local state first so the UI
 * responds instantly, fire the request, then roll back if the server refuses.
 * Socket events from *other* users patch the same state — events caused by this
 * client are ignored (`by === myId`) so a move never gets applied twice.
 */
export const useBoard = create((set, get) => ({
  board: null,
  lists: [],
  cards: [],
  loading: true,
  viewers: [],
  filters: { q: '', assignee: '', priority: '', label: '' },

  setFilters: (patch) => set({ filters: { ...get().filters, ...patch } }),
  resetFilters: () => set({ filters: { q: '', assignee: '', priority: '', label: '' } }),

  load: async (boardId, workspaceId) => {
    set({ loading: true });
    const { data } = await api.get(`/boards/${boardId}`, { params: { workspaceId } });
    set({ board: data.board, lists: data.lists, cards: data.cards, loading: false });
  },

  clear: () => set({ board: null, lists: [], cards: [], viewers: [], loading: true }),

  /* ------------------------------ lists ------------------------------ */

  addList: async (title, workspaceId) => {
    const { data } = await api.post('/lists', { title, boardId: get().board._id, workspaceId });
    set({ lists: [...get().lists, data] });
  },

  renameList: async (listId, title, workspaceId) => {
    const previous = get().lists;
    set({ lists: previous.map((l) => (l._id === listId ? { ...l, title } : l)) });
    try {
      await api.put(`/lists/${listId}`, { title, workspaceId });
    } catch (err) {
      set({ lists: previous });
      throw err;
    }
  },

  removeList: async (listId, workspaceId) => {
    const previous = { lists: get().lists, cards: get().cards };
    set({
      lists: previous.lists.filter((l) => l._id !== listId),
      cards: previous.cards.filter((c) => c.list !== listId),
    });
    try {
      await api.delete(`/lists/${listId}`, { params: { workspaceId } });
    } catch (err) {
      set(previous);
      throw err;
    }
  },

  reorderLists: async (order, workspaceId) => {
    const previous = get().lists;
    const byId = Object.fromEntries(previous.map((l) => [l._id, l]));
    set({ lists: order.map((id, i) => ({ ...byId[id], position: i })) });
    try {
      await api.put('/lists/reorder', { boardId: get().board._id, order, workspaceId });
    } catch (err) {
      set({ lists: previous });
      throw err;
    }
  },

  /* ------------------------------ cards ------------------------------ */

  addCard: async (listId, payload, workspaceId) => {
    const { data } = await api.post('/cards', { ...payload, listId, workspaceId });
    // The socket echo is ignored for the creator, so add it here.
    if (!get().cards.some((c) => c._id === data._id)) set({ cards: [...get().cards, data] });
    return data;
  },

  patchCard: async (cardId, patch, workspaceId) => {
    const previous = get().cards;
    set({ cards: previous.map((c) => (c._id === cardId ? { ...c, ...patch } : c)) });
    try {
      const { data } = await api.put(`/cards/${cardId}`, { ...patch, workspaceId });
      set({ cards: get().cards.map((c) => (c._id === cardId ? data : c)) });
      return data;
    } catch (err) {
      set({ cards: previous });
      throw err;
    }
  },

  removeCard: async (cardId, workspaceId) => {
    const previous = get().cards;
    set({ cards: previous.filter((c) => c._id !== cardId) });
    try {
      await api.delete(`/cards/${cardId}`, { params: { workspaceId } });
    } catch (err) {
      set({ cards: previous });
      throw err;
    }
  },

  /** Optimistic drag: the card lands in its new place before the request resolves. */
  moveCard: async ({ cardId, toListId, position }, workspaceId) => {
    const previous = get().cards;
    const card = previous.find((c) => c._id === cardId);
    if (!card) return;

    const others = previous.filter((c) => c._id !== cardId);
    const target = others.filter((c) => c.list === toListId).sort((a, b) => a.position - b.position);
    target.splice(position, 0, { ...card, list: toListId });

    const repositioned = target.map((c, i) => ({ ...c, position: i }));
    const untouched = others.filter((c) => c.list !== toListId);
    set({ cards: [...untouched, ...repositioned] });

    try {
      await api.put(`/cards/${cardId}/move`, { toListId, position, workspaceId });
    } catch (err) {
      set({ cards: previous });
      throw err;
    }
  },

  /* -------------------- patches applied by socket events -------------------- */

  applyCardCreated: (card) =>
    set((s) => (s.cards.some((c) => c._id === card._id) ? s : { cards: [...s.cards, card] })),

  applyCardUpdated: (card) =>
    set((s) => ({ cards: s.cards.map((c) => (c._id === card._id ? { ...c, ...card } : c)) })),

  applyCardDeleted: (cardId) => set((s) => ({ cards: s.cards.filter((c) => c._id !== cardId) })),

  applyCardMoved: ({ card, toListId, position }) =>
    set((s) => {
      const others = s.cards.filter((c) => c._id !== card._id);
      const target = others.filter((c) => c.list === toListId).sort((a, b) => a.position - b.position);
      target.splice(position, 0, { ...card, list: toListId });
      return {
        cards: [
          ...others.filter((c) => c.list !== toListId),
          ...target.map((c, i) => ({ ...c, position: i })),
        ],
      };
    }),

  applyListCreated: (list) =>
    set((s) => (s.lists.some((l) => l._id === list._id) ? s : { lists: [...s.lists, list] })),

  applyListUpdated: (list) =>
    set((s) => ({ lists: s.lists.map((l) => (l._id === list._id ? list : l)) })),

  applyListDeleted: (listId) =>
    set((s) => ({ lists: s.lists.filter((l) => l._id !== listId), cards: s.cards.filter((c) => c.list !== listId) })),

  applyListReordered: (order) =>
    set((s) => {
      const byId = Object.fromEntries(s.lists.map((l) => [l._id, l]));
      return { lists: order.filter((id) => byId[id]).map((id, i) => ({ ...byId[id], position: i })) };
    }),

  applyBoardUpdated: (board) => set({ board }),

  setViewers: (viewers) => set({ viewers }),
}));

/** Cards for one list, sorted and filtered, ready to render. */
export const selectListCards = (state, listId) => {
  const { q, assignee, priority, label } = state.filters;
  return state.cards
    .filter((c) => c.list === listId)
    .filter((c) => (q ? `${c.title} ${c.description}`.toLowerCase().includes(q.toLowerCase()) : true))
    .filter((c) => (assignee ? String(c.assignee?._id || c.assignee) === assignee : true))
    .filter((c) => (priority ? c.priority === priority : true))
    .filter((c) => (label ? (c.labels || []).includes(label) : true))
    .sort((a, b) => a.position - b.position);
};
