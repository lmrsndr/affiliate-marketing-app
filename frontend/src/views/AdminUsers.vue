<script setup>
import { ref, computed, onMounted, watch } from "vue";
import API from "@/api";                    // axios instance with cookies + interceptor
import { guardedGet } from "@/lib/guarded-api"; // for GETs with 401/403 handling

/* ────────────────────────────────────────────────────────────
   Local guarded helpers for PATCH / DELETE (mirrors guarded-api)
──────────────────────────────────────────────────────────── */
function handle403(reason) {
  if (reason === "TOTP_REQUIRED" || reason === "EMAIL_2FA_REQUIRED" || reason === "MFA_REQUIRED") {
    window.location.assign("/verify-2fa");
    return true;
  }
  if (reason === "NOT_ADMIN") {
    window.location.assign("/dashboard");
    return true;
  }
  return false;
}

async function guardedPatch(path, body = {}, config = {}) {
  try {
    const res = await API.patch(path, body, config);
    return res.data;
  } catch (e) {
    const s = e?.response?.status;
    const r = e?.response?.data?.reason;
    if (s === 403 && handle403(r)) return;
    throw e;
  }
}

async function guardedDelete(path, config = {}) {
  try {
    const res = await API.delete(path, config);
    return res.data;
  } catch (e) {
    const s = e?.response?.status;
    const r = e?.response?.data?.reason;
    if (s === 403 && handle403(r)) return;
    throw e;
  }
}

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const users = ref([]);
const loading = ref(true);
const errorText = ref("");
const infoText = ref("");

// filters
const searchQuery = ref("");
const roleFilter = ref("");
const statusFilter = ref("");

// pagination
const currentPage = ref(1);
const itemsPerPage = 10;

/* ────────────────────────────────────────────────────────────
   Load data
──────────────────────────────────────────────────────────── */
async function fetchUsers() {
  loading.value = true;
  errorText.value = "";
  try {
    const data = await guardedGet("/user/all");
    users.value = Array.isArray(data) ? data : (data?.items || []);
    // prime a working field for role select (so we can compare & disable Save buttons if needed later)
    users.value.forEach(u => { if (u._nextRole === undefined) u._nextRole = u.role || "user"; });
  } catch (e) {
    console.error("Fetch users failed:", e?.response?.data || e);
    errorText.value = e?.response?.data?.message || "Failed to load users.";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchUsers);

/* ────────────────────────────────────────────────────────────
   Filters / pagination
──────────────────────────────────────────────────────────── */
const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const role = roleFilter.value;
  const status = statusFilter.value; // "", "active", "suspended"

  return users.value.filter(u => {
    const matchesSearch =
      !q ||
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q);

    const matchesRole = role ? (u.role || "user") === role : true;

    const matchesStatus =
      status === "active" ? !u.suspended :
      status === "suspended" ? !!u.suspended :
      true;

    return matchesSearch && matchesRole && matchesStatus;
  });
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredUsers.value.length / itemsPerPage))
);

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredUsers.value.slice(start, start + itemsPerPage);
});

// reset pagination when filters/search change
watch([searchQuery, roleFilter, statusFilter], () => (currentPage.value = 1));

/* ────────────────────────────────────────────────────────────
   Mutations
──────────────────────────────────────────────────────────── */
function showInfo(msg, ms = 2000) {
  infoText.value = msg;
  setTimeout(() => (infoText.value = ""), ms);
}

async function updateUser(user) {
  // optimistic snapshot
  const prev = { role: user.role, title: user.title, badges: user.badges };
  try {
    await guardedPatch(`/user/${encodeURIComponent(user._id)}`, {
      role: user.role,
      title: user.title,
      badges: user.badges,
    });
    user._nextRole = user.role;
    showInfo("User updated.");
  } catch (e) {
    console.error("Update user failed:", e?.response?.data || e);
    errorText.value = e?.response?.data?.message || "Failed to update user.";
    // revert optimistic changes
    user.role = prev.role;
    user.title = prev.title;
    user.badges = prev.badges;
  }
}

async function toggleSuspend(user) {
  const desired = !user.suspended;
  const prev = user.suspended;
  user.suspended = desired; // optimistic
  try {
    await guardedPatch(`/user/${encodeURIComponent(user._id)}/suspend`, { suspended: desired });
    showInfo(desired ? "User suspended." : "User unsuspended.");
  } catch (e) {
    console.error("Suspend toggle failed:", e?.response?.data || e);
    errorText.value = e?.response?.data?.message || "Failed to change suspension state.";
    user.suspended = prev; // revert
  }
}

async function deleteUser(id) {
  if (!confirm("Delete this user?")) return;
  const prev = [...users.value];
  users.value = users.value.filter(u => u._id !== id); // optimistic
  try {
    await guardedDelete(`/user/${encodeURIComponent(id)}`);
    showInfo("User deleted.");
  } catch (e) {
    console.error("Delete user failed:", e?.response?.data || e);
    errorText.value = e?.response?.data?.message || "Failed to delete user.";
    users.value = prev; // revert
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8 admin-users">
    <header class="mb-6">
      <h1 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">
        Manage Users
      </h1>
      <p class="text-muted mt-1">Search, filter, update roles & titles, suspend and delete.</p>
    </header>

    <!-- Status -->
    <div v-if="loading" class="bb-card p-4 mb-6" aria-busy="true">Loading users…</div>
    <div v-else-if="errorText" class="bb-card p-4 mb-6">
      <div class="text-red-600 font-semibold">Error</div>
      <div class="mt-1">{{ errorText }}</div>
    </div>

    <div v-else class="space-y-6">
      <!-- Filters -->
      <section class="bb-card p-4">
        <div class="grid gap-3 md:grid-cols-4 items-end">
          <label class="flex flex-col">
            <span class="text-sm text-muted mb-1">Search</span>
            <input class="bb-input" v-model="searchQuery" placeholder="Name or email…" />
          </label>

          <label class="flex flex-col">
            <span class="text-sm text-muted mb-1">Role</span>
            <select class="bb-select" v-model="roleFilter">
              <option value="">All roles</option>
              <option value="user">User</option>
              <option value="partner">Partner</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label class="flex flex-col">
            <span class="text-sm text-muted mb-1">Status</span>
            <select class="bb-select" v-model="statusFilter">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>

          <div class="md:justify-self-end">
            <button class="bb-btn bb-btn--ghost" @click="searchQuery=''; roleFilter=''; statusFilter=''">
              Reset
            </button>
          </div>
        </div>
      </section>

      <!-- Table -->
      <section class="bb-card p-0 overflow-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b" :class="'border-[var(--bb-border)]'">
              <th class="text-left p-3">Name</th>
              <th class="text-left p-3">Email</th>
              <th class="text-left p-3">Role</th>
              <th class="text-left p-3">Title</th>
              <th class="text-left p-3">Badges</th>
              <th class="text-left p-3">Status</th>
              <th class="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in paginatedUsers"
              :key="user._id"
              class="border-b"
              :class="'border-[var(--bb-border)]'"
            >
              <td class="p-3">{{ user.name || "—" }}</td>
              <td class="p-3 text-muted">{{ user.email }}</td>

              <td class="p-3">
                <select class="bb-select" v-model="user.role" @change="updateUser(user)">
                  <option value="user">User</option>
                  <option value="partner">Partner</option>
                  <option value="admin">Admin</option>
                </select>
              </td>

              <td class="p-3">
                <input class="bb-input" v-model="user.title" @blur="updateUser(user)" placeholder="Title…" />
              </td>

              <td class="p-3">
                <input
                  class="bb-input"
                  v-model="user.badges"
                  @blur="updateUser(user)"
                  placeholder="Comma separated"
                />
              </td>

              <td class="p-3">
                <span :class="user.suspended ? 'text-muted' : 'text-green-600'">
                  {{ user.suspended ? 'Suspended' : 'Active' }}
                </span>
              </td>

              <td class="p-3">
                <div class="flex gap-2">
                  <button class="bb-btn bb-btn--ghost" @click="toggleSuspend(user)">
                    {{ user.suspended ? 'Unsuspend' : 'Suspend' }}
                  </button>
                  <button class="bb-btn bb-btn--danger" @click="deleteUser(user._id)">
                    Delete
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!paginatedUsers.length">
              <td colspan="7" class="p-4 text-center text-muted">No users found.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Pagination -->
      <section class="bb-card p-3 flex items-center justify-center gap-3" v-if="totalPages > 1">
        <button class="bb-btn bb-btn--ghost" :disabled="currentPage === 1" @click="currentPage--">Previous</button>
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <button class="bb-btn bb-btn--ghost" :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
      </section>

      <p v-if="infoText" class="text-green-700">{{ infoText }}</p>
      <p v-if="errorText" class="text-red-600">{{ errorText }}</p>
    </div>
  </div>
</template>

<style scoped>
.admin-users { /* minimal container tweaks; visuals via brand.css */ }
table th, table td { border-color: var(--bb-border); }
</style>
