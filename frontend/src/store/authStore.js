import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,

  setAuth: (user, token) => {
    localStorage.setItem('erp_token', token);
    localStorage.setItem('erp_user', JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    set({ user: null, token: null });
  },

  // Call on app init to restore session from localStorage
  hydrate: () => {
    const token = localStorage.getItem('erp_token');
    const userStr = localStorage.getItem('erp_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        // Check if token is expired by decoding payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token expired — clean up
          localStorage.removeItem('erp_token');
          localStorage.removeItem('erp_user');
          return;
        }
        set({ user, token });
      } catch {
        localStorage.removeItem('erp_token');
        localStorage.removeItem('erp_user');
      }
    }
  },
}));
