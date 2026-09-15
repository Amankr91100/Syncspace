import { create } from 'zustand';

let nextId = 1;

export const useUI = create((set, get) => ({
  toasts: [],
  theme: localStorage.getItem('syncspace_theme') || 'dark',
  searchOpen: false,
  sidebarOpen: false,
  confirm: null,

  toast: (message, tone = 'info') => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3600);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  toggleTheme: () => {
    const theme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('syncspace_theme', theme);
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
  applyTheme: () => {
    const { theme } = get();
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },

  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  /** Promise-based confirmation dialog: `await ask({ title, body, confirmLabel })`. */
  ask: (options) => new Promise((resolve) => set({ confirm: { ...options, resolve } })),
  closeConfirm: (result) => {
    const { confirm } = get();
    confirm?.resolve(result);
    set({ confirm: null });
  },
}));
