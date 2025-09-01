import { defineStore } from 'pinia';

export const RoleLevel = { general:0, user:1, partner:2, admin:3 } as const;
type Role = keyof typeof RoleLevel;

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '' as string,
    role: 'general' as Role,
  }),
  getters: {
    isAuthenticated: (s) => !!s.token,
    roleLevel: (s) => RoleLevel[s.role],
  },
  actions: {
    setSession(token: string, role: Role) { this.token = token; this.role = role; },
    logout() { this.token = ''; this.role = 'general'; },
  },
});
