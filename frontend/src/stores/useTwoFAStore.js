// stores/useTwoFAStore.js
import { defineStore } from "pinia";

export const useTwoFAStore = defineStore("twoFA", {
  state: () => ({
    verified: false,
    syncedFromCookie: false,
  }),

  getters: {
    isVerified: (state) => state.verified,
  },

  actions: {
    /**
     * Reads the `twoFACookie` or `trustedDevice` cookie to sync 2FA state,
     * but only if not already verified manually (e.g., via backend).
     */
    syncFromCookie() {
      if (this.verified) return; // Don't override confirmed verification

      const twoFACookie = this._getCookie("twoFACookie");
      const trustedDevice = this._getCookie("trustedDevice");

      if (twoFACookie === "true" || trustedDevice) {
        this.verified = true;
        this.syncedFromCookie = true;
        console.log("🔁 2FA synced from cookie");
      } else {
        this.verified = false;
        this.syncedFromCookie = true;
        console.log("🔁 2FA NOT verified from cookie");
      }
    },

    /**
     * Manually set 2FA state (from backend or explicit user action).
     * @param {boolean} value
     */
    setVerified(value) {
      this.verified = value;
      this.syncedFromCookie = false;
    },

    /**
     * Clear 2FA state (e.g. on logout).
     */
    reset() {
      this.verified = false;
      this.syncedFromCookie = false;
    },

    /**
     * Internal utility to read a cookie by name.
     * @param {string} name
     * @returns {string|null}
     */
    _getCookie(name) {
      const match = document.cookie.match(new RegExp(`${name}=([^;]+)`));
      return match ? decodeURIComponent(match[1]) : null;
    },
  },
});
