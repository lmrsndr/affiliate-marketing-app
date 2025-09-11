import { defineStore } from 'pinia';

export const RoleLevel = { general:0, user:1, partner:2, admin:3 } as const;
type Role = keyof typeof RoleLevel;

type UserInfo = {
  id: string;
  email: string;
  role: Role;
  twoFAVerified: boolean;
};

export const useUserStore = defineStore('user', {
  state: () => ({
    // session
    accessToken: '' as string,
    user: null as UserInfo | null,
    // bootstrap flag to avoid guards running too early
    initialized: false,
  }),
  getters: {
    isAuthenticated: (s) => !!s.accessToken || !!s.user,
    role: (s): Role => s.user?.role ?? 'general',
    roleLevel(): number { return RoleLevel[this.role]; },
    twoFAVerified: (s) => s.user?.twoFAVerified === true,
  },
  actions: {
    async initSession() {
      try {
        // Call your status endpoint that reads HttpOnly cookies server-side.
        // It should return: { accessToken?, isAuthenticated, user: {id,email,role,twoFAVerified} }
        const res = await fetch('/auth/status', { credentials: 'include' });
        if (!res.ok) throw new Error('status failed');
        const data = await res.json();
        this.accessToken = data.accessToken || '';
        this.user = data.user ?? null;
      } catch (_e) {
        this.accessToken = '';
        this.user = null;
      } finally {
        this.initialized = true;
      }
    },
    setSession(accessToken: string, user: UserInfo) {
      this.accessToken = accessToken;
      this.user = user;
      this.initialized = true;
    },
    clearSession() {
      this.accessToken = '';
      this.user = null;
      this.initialized = true;
    },
    // Helper when OTP was just verified and server rotated cookies:
    async refreshAfter2FA() {
      this.initialized = false;
      await this.initSession();
    },
  },
});
