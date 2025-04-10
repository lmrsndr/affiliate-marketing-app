<template>
  <transition name="fade">
    <div
      v-if="show"
      class="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg shadow-lg max-w-sm z-50"
    >
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <strong class="block font-bold mb-1">⚠️ Improve Your Security</strong>
          <span class="block text-sm">
            You're using email-based 2FA. For stronger protection, switch to an authenticator app.
          </span>
          <router-link
            to="/settings/security"
            class="text-blue-600 hover:underline mt-2 block text-sm font-semibold"
          >
            Set Up App-Based 2FA →
          </router-link>
          <label class="block mt-3 text-xs">
            <input type="checkbox" v-model="dontShowAgain" class="mr-1" />
            Don't show this again
          </label>
        </div>
        <button
          @click="closePrompt"
          class="ml-4 text-yellow-700 hover:text-yellow-900 font-bold text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  </transition>

  <!-- ✅ Toast Confirmation -->
  <transition name="fade">
    <div
      v-if="toastVisible"
      class="fixed bottom-4 left-4 bg-green-100 border border-green-400 text-green-800 px-4 py-2 rounded-lg shadow-md text-sm z-50"
    >
      Prompt snoozed. We'll remind you {{ dontShowAgain ? 'never again' : 'tomorrow' }}. ✅
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const show = ref(false);
const toastVisible = ref(false);
const dontShowAgain = ref(false);

const STORAGE_KEY_LAST_SHOWN = "2fa-upgrade-prompt-last-shown";
const STORAGE_KEY_DISABLED = "2fa-upgrade-prompt-disabled";

function closePrompt() {
  show.value = false;

  // ✅ Save preference
  if (dontShowAgain.value) {
    localStorage.setItem(STORAGE_KEY_DISABLED, "true");
  } else {
    localStorage.setItem(STORAGE_KEY_LAST_SHOWN, new Date().toISOString());
  }

  // ✅ Show toast for 3 seconds
  toastVisible.value = true;
  setTimeout(() => {
    toastVisible.value = false;
  }, 3000);
}

function hasShownToday() {
  const lastShown = localStorage.getItem(STORAGE_KEY_LAST_SHOWN);
  if (!lastShown) return false;

  const lastDate = new Date(lastShown);
  const now = new Date();

  return (
    lastDate.getFullYear() === now.getFullYear() &&
    lastDate.getMonth() === now.getMonth() &&
    lastDate.getDate() === now.getDate()
  );
}

function isPermanentlyDisabled() {
  return localStorage.getItem(STORAGE_KEY_DISABLED) === "true";
}

onMounted(() => {
  if (isPermanentlyDisabled() || hasShownToday()) return;

  window.addEventListener("show-2fa-upgrade-prompt", () => {
    if (!isPermanentlyDisabled() && !hasShownToday()) {
      show.value = true;
    }
  });
});
</script>

<style scoped>
/* ✅ Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
