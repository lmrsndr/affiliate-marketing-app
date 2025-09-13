<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import API from "@/api"; // axios instance with cookies + interceptors

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const router = useRouter();

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");

const submitting = ref(false);
const errorText = ref("");
const successText = ref("");

/* ────────────────────────────────────────────────────────────
   Derived: OAuth start URL (drop trailing /api from VITE_API_URL)
──────────────────────────────────────────────────────────── */
const apiBase = (import.meta.env.VITE_API_URL || "https://api.bundlebee.co.uk/api").replace(/\/+$/, "");
const oauthBase = apiBase.replace(/\/api$/i, "");
const googleOAuthHref = `${oauthBase}/auth/google`;

/* ────────────────────────────────────────────────────────────
   Validation & strength meter (client-side hints only)
──────────────────────────────────────────────────────────── */
const emailOk = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()));
const pwLen   = computed(() => password.value.length);
const pwHasNum   = computed(() => /\d/.test(password.value));
const pwHasSym   = computed(() => /[^A-Za-z0-9]/.test(password.value));
const pwHasCase  = computed(() => /[a-z]/.test(password.value) && /[A-Z]/.test(password.value));

const pwScore = computed(() => {
  let s = 0;
  if (pwLen.value >= 8) s++;
  if (pwHasCase.value) s++;
  if (pwHasNum.value) s++;
  if (pwHasSym.value) s++;
  return s; // 0..4
});
const pwLabel = computed(() => ["Too short", "Weak", "Okay", "Good", "Strong"][pwScore.value]);
const pwBarPct = computed(() => [0, 25, 50, 75, 100][pwScore.value]);

const canSubmit = computed(() =>
  name.value.trim() &&
  emailOk.value &&
  pwLen.value >= 8 &&
  password.value === confirmPassword.value
);

/* ────────────────────────────────────────────────────────────
   Show/Hide password
──────────────────────────────────────────────────────────── */
const showPw = ref(false);
const showPw2 = ref(false);

/* ────────────────────────────────────────────────────────────
   Submit
──────────────────────────────────────────────────────────── */
async function register() {
  errorText.value = "";
  successText.value = "";

  if (password.value !== confirmPassword.value) {
    errorText.value = "Passwords do not match.";
    return;
  }
  if (!emailOk.value) {
    errorText.value = "Please enter a valid email address.";
    return;
  }
  if (pwLen.value < 8) {
    errorText.value = "Password must be at least 8 characters.";
    return;
  }

  submitting.value = true;
  try {
    // New local-auth endpoint
    await API.post("/auth/local/register", {
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
    });

    // Keep messaging generic; many backends either sign you in or ask for login/2FA next.
    successText.value = "Registration successful. You can now sign in.";
    setTimeout(() => router.push("/login"), 1200);
  } catch (e) {
    // Common backend messages: email already in use, weak password, etc.
    const msg = e?.response?.data?.message || "Registration failed. Please try again.";
    errorText.value = msg;
    console.error("Registration error:", e?.response?.data || e);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-10">
    <section class="bb-card p-6">
      <header class="mb-5 text-center">
        <h1 class="text-2xl font-bold" style="font-family: var(--bb-font-heading);">Create Account</h1>
        <p class="text-muted mt-1">Join BundleBee in a minute.</p>
      </header>

      <!-- Feedback banners -->
      <p v-if="successText" class="mb-3 text-green-700">{{ successText }}</p>
      <p v-if="errorText" class="mb-3 text-red-600">{{ errorText }}</p>

      <form class="grid gap-3" @submit.prevent="register">
        <!-- Name -->
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">Full Name</span>
          <input class="bb-input" v-model="name" type="text" placeholder="Jane Doe" required />
        </label>

        <!-- Email -->
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">Email</span>
          <input class="bb-input" v-model="email" type="email" placeholder="you@example.com" autocomplete="email" required />
        </label>

        <!-- Password -->
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">Password</span>
          <div class="relative">
            <input
              class="bb-input pr-20"
              :type="showPw ? 'text' : 'password'"
              v-model="password"
              autocomplete="new-password"
              required
            />
            <button
              type="button"
              class="bb-btn bb-btn--ghost absolute right-1 top-1/2 -translate-y-1/2"
              @click="showPw = !showPw"
            >
              {{ showPw ? 'Hide' : 'Show' }}
            </button>
          </div>
          <!-- Strength meter -->
          <div class="h-2 mt-2 rounded" :style="{
            background: 'var(--bb-surface-2)'
          }">
            <div
              class="h-2 rounded"
              :style="{
                width: pwBarPct + '%',
                background: pwScore >= 3 ? 'var(--bb-success, #28a745)' :
                           pwScore === 2 ? 'var(--bb-warning, #ffb800)' :
                           'var(--bb-danger, #dc3545)'
              }"
            ></div>
          </div>
          <small class="text-muted">{{ pwLabel }}</small>
        </label>

        <!-- Confirm Password -->
        <label class="flex flex-col">
          <span class="text-sm text-muted mb-1">Confirm Password</span>
          <div class="relative">
            <input
              class="bb-input pr-20"
              :type="showPw2 ? 'text' : 'password'"
              v-model="confirmPassword"
              autocomplete="new-password"
              required
            />
            <button
              type="button"
              class="bb-btn bb-btn--ghost absolute right-1 top-1/2 -translate-y-1/2"
              @click="showPw2 = !showPw2"
            >
              {{ showPw2 ? 'Hide' : 'Show' }}
            </button>
          </div>
        </label>

        <!-- Submit -->
        <button
          type="submit"
          class="bb-btn bb-btn--primary mt-2"
          :disabled="submitting || !canSubmit"
          :aria-busy="submitting ? 'true' : 'false'"
        >
          {{ submitting ? "Creating…" : "Register" }}
        </button>

        <!-- Divider -->
        <div class="flex items-center gap-3 my-2">
          <div class="flex-1" :style="{ height: '1px', background: 'var(--bb-border)' }"></div>
          <span class="text-muted text-xs">or</span>
          <div class="flex-1" :style="{ height: '1px', background: 'var(--bb-border)' }"></div>
        </div>

        <!-- Google OAuth -->
        <a class="bb-btn bb-btn--ghost w-full text-center" :href="googleOAuthHref">
          Continue with Google
        </a>
      </form>

      <div class="text-center mt-4 text-sm">
        Already have an account?
        <router-link to="/login" class="underline">Login</router-link>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Visuals come from brand.css; keep local tweaks minimal */
</style>
