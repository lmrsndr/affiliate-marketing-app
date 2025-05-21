// stores/useTwoFAStore.js
import { defineStore } from "pinia";

export const useTwoFAStore = defineStore("twoFA", {
  state: () => ({
    verified: false,
  }),

  getters: {
    isVerified: (state) => state.verified,
  },

  actions: {
    /**
     * Reads the `twoFACookie` or `trustedDevice` cookie to sync 2FA state.
     */
    syncFromCookie() {
      const twoFACookie = this._getCookie("twoFACookie");
      const trustedDevice = this._getCookie("trustedDevice");

      if (twoFACookie === "true" || trustedDevice) {
        this.verified = true;
      } else {
        this.verified = false;
      }
    },

    /**
     * Manually set 2FA state.
     * @param {boolean} value
     */
    setVerified(value) {
      this.verified = value;
    },

    /**
     * Clear 2FA state (e.g. on logout).
     */
    reset() {
      this.verified = false;
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
