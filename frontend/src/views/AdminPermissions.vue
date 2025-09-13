<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import API from "@/api";
import { guardedGet, guardedPost, guardedPut } from "@/lib/guarded-api";

/* ─────────────────────────────────────────────────────────────
   1) Model & Defaults
────────────────────────────────────────────────────────────── */
const DEFAULT_PERMISSION_KEYS = [
  "viewAnalytics",
  "manageAffiliates",
  "manageUsers",
  "manageAccounting",
  "managePermissions",
];

const DEFAULT_ROLES = [
  {
    name: "admin",
    label: "Admin",
    description: "Full access to all dashboards and settings.",
    permissions: {
      viewAnalytics: true,
      manageAffiliates: true,
      manageUsers: true,
      manageAccounting: true,
      managePermissions: true,
    },
    locked: true, // cannot delete core role
  },
  {
    name: "partner",
    label: "Partner",
    description: "Access partner tools and analytics relevant to their content.",
    permissions: {
      viewAnalytics: true,
      manageAffiliates: true,
      manageUsers: false,
      manageAccounting: false,
      managePermissions: false,
    },
    locked: true,
  },
  {
    name: "user",
    label: "User",
    description: "Basic user access.",
    permissions: {
      viewAnalytics: false,
      manageAffiliates: false,
      manageUsers: false,
      manageAccounting: false,
      managePermissions: false,
    },
    locked: true,
  },
];

/* ─────────────────────────────────────────────────────────────
   2) State
────────────────────────────────────────────────────────────── */
const roles = ref([]);               // [{ name, label, description, permissions{...}, locked? }]
const users = ref([]);               // loaded from /user/all
const loading = ref(true);
const savingRoles = ref(false);
const savingUser = ref(false);
const err = ref("");
const info = ref("");

// Fallback banner when backend endpoints are missing
const backendMissing = ref(false);

// Users table UI
const search = ref("");
const currentPage = ref(1);
const itemsPerPage = 10;

// new role form
const newRole = reactive({
  label: "",
  name: "",
  description: "",
  permissions: Object.fromEntries(DEFAULT_PERMISSION_KEYS.map(k => [k, false])),
});

/* ─────────────────────────────────────────────────────────────
   3) Local helpers
────────────────────────────────────────────────────────────── */
function slugifyLabel(label) {
  return (label || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function showInfo(message, ms = 2200) {
  info.value = message;
  setTimeout(() => (info.value = ""), ms);
}

/* guarded PATCH (local) */
async function guardedPatch(path, body = {}, config = {}) {
  try {
    const res = await API.patch(path, body, config);
    return res.data;
  } catch (e) {
    const s = e?.response?.status;
    const r = e?.response?.data?.reason;
    if (s === 403) {
      if (r === "TOTP_REQUIRED" || r === "EMAIL_2FA_REQUIRED" || r === "MFA_REQUIRED") {
        window.location.assign("/verify-2fa");
        return;
      }
      if (r === "NOT_ADMIN") {
        window.location.assign("/dashboard");
        return;
      }
    }
    throw e;
  }
}

/* ─────────────────────────────────────────────────────────────
   4) Load data
   - Roles from /admin/permissions/roles (if present) else defaults
   - Users from /user/all (present in your routes list)
────────────────────────────────────────────────────────────── */
async function loadRoles() {
  try {
    const data = await guardedGet("/admin/permissions/roles");
    // expected: { roles: [...] }
    const got = Array.isArray(data?.roles) ? data.roles : [];
    if (!got.length) throw new Error("empty");
    roles.value = got.map(r => ({
      ...r,
      permissions: { ...Object.fromEntries(DEFAULT_PERMISSION_KEYS.map(k => [k, false])), ...(r.permissions || {}) },
      locked: !!r.locked,
    }));
  } catch {
    // fallback to defaults; mark missing backend (no hard crash)
    roles.value = DEFAULT_ROLES.map(r => ({ ...r, permissions: { ...r.permissions } }));
    backendMissing.value = true;
  }
}

async function loadUsers() {
  try {
    const data = await guardedGet("/user/all");
    // expected: array of users with { _id, name, email, role }
    users.value = Array.isArray(data) ? data : (data?.items || []);
  } catch (e) {
    console.error("Failed to load users:", e?.response?.data || e);
    err.value = "Unable to load users.";
  }
}

async function loadAll() {
  loading.value = true;
  err.value = "";
  try {
    await Promise.all([loadRoles(), loadUsers()]);
  } catch (e) {
    err.value = e?.response?.data?.message || e?.message || "Failed to load data.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);

/* ─────────────────────────────────────────────────────────────
   5) Roles CRUD
────────────────────────────────────────────────────────────── */
function addRole() {
  const label = newRole.label.trim();
  if (!label) return;
  const name = slugifyLabel(label);
  if (!name) return;

  // prevent duplicates
  if (roles.value.some(r => r.name === name)) {
    err.value = `Role "${label}" already exists.`;
    return;
  }

  roles.value.push({
    name,
    label,
    description: newRole.description.trim(),
    permissions: { ...newRole.permissions },
    locked: false,
  });

  // reset form
  newRole.label = "";
  newRole.description = "";
  newRole.permissions = Object.fromEntries(DEFAULT_PERMISSION_KEYS.map(k => [k, false]));
  showInfo("Role added (not saved yet).");
}

function removeRole(name) {
  const r = roles.value.find(x => x.name === name);
  if (!r || r.locked) return;
  roles.value = roles.value.filter(x => x.name !== name);
  showInfo("Role removed (not saved yet).");
}

function togglePerm(roleName, permKey) {
  const r = roles.value.find(x => x.name === roleName);
  if (!r) return;
  r.permissions[permKey] = !r.permissions[permKey];
}

async function saveRoles() {
  savingRoles.value = true;
  err.value = "";
  try {
    // expected endpoint (create/edit/delete in one payload)
    // body: { roles: [...] }
    await guardedPut("/admin/permissions/roles", { roles: roles.value });
    backendMissing.value = false;
    showInfo("Roles saved.");
  } catch (e) {
    console.error("Save roles failed:", e?.response?.data || e);
    err.value = e?.response?.data?.message || "Failed to save roles. If this endpoint is missing, see the banner above.";
  } finally {
    savingRoles.value = false;
  }
}

/* ─────────────────────────────────────────────────────────────
   6) User role assignment
────────────────────────────────────────────────────────────── */
const roleChoices = computed(() =>
  roles.value.map(r => ({ value: r.name, label: r.label }))
);

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter(u =>
    (u.name || "").toLowerCase().includes(q) ||
    (u.email || "").toLowerCase().includes(q)
  );
});
const pagedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredUsers.value.slice(start, start + itemsPerPage);
});
watch(search, () => (currentPage.value = 1));

async function updateUserRole(userId, roleName) {
  savingUser.value = true;
  err.value = "";
  try {
    // expected endpoint:
    // PATCH /admin/permissions/users/:id { role: roleName }
    // If your backend lacks this, add the snippet I can provide on request.
    await guardedPatch(`/admin/permissions/users/${encodeURIComponent(userId)}`, { role: roleName });
    showInfo("User role updated.");
  } catch (e) {
    console.error("Update role failed:", e?.response?.data || e);
    err.value = e?.response?.data?.message || "Failed to update user role.";
    // revert optimistic change in UI
    const u = users.value.find(u => u._id === userId);
    if (u) {
      // try to read role from server (best-effort)
      try {
        const got = await guardedGet(`/user/${encodeURIComponent(userId)}`);
        if (got && got.role) u.role = got.role;
      } catch {}
    }
  } finally {
    savingUser.value = false;
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <header class="mb-6">
      <h1 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">
        User Levels & Permissions
      </h1>
      <p class="text-muted mt-1">Create roles, set capabilities, and assign them to users.</p>
    </header>

    <div v-if="loading" class="bb-card p-4 mb-6" aria-busy="true">Loading…</div>

    <div v-else>
      <!-- Backend missing banner -->
      <div v-if="backendMissing" class="bb-card p-4 mb-6">
        <div class="font-semibold">Heads up</div>
        <p class="text-muted mt-1">
          Permissions endpoints weren’t found. You can still edit the matrix and assign roles for the session,
          but saving to the server will fail until the backend routes are added.
        </p>
        <p class="text-muted">
          Expected endpoints: <code>/admin/permissions/roles</code> (GET/PUT), 
          <code>/admin/permissions/users/:id</code> (PATCH).
        </p>
      </div>

      <!-- Roles & Permissions Matrix -->
      <section class="bb-card p-5 mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold" style="font-family: var(--bb-font-heading);">Roles & Permissions</h2>
          <button class="bb-btn bb-btn--primary" :disabled="savingRoles" @click="saveRoles">
            {{ savingRoles ? "Saving…" : "Save roles" }}
          </button>
        </div>

        <!-- Add Role -->
        <div class="grid md:grid-cols-3 gap-3 mb-5">
          <input class="bb-input" v-model="newRole.label" placeholder="New role label (e.g., Editor)" />
          <input class="bb-input" :value="slugifyLabel(newRole.label)" readonly placeholder="Role key" />
          <input class="bb-input" v-model="newRole.description" placeholder="Description" />
          <div class="md:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-2">
            <label v-for="k in DEFAULT_PERMISSION_KEYS" :key="k" class="flex items-center gap-2">
              <input type="checkbox" v-model="newRole.permissions[k]" />
              <span class="text-sm">{{ k }}</span>
            </label>
          </div>
          <div class="md:col-span-3 flex justify-end">
            <button class="bb-btn bb-btn--ghost" @click="addRole">Add role</button>
          </div>
        </div>

        <!-- Matrix -->
        <div class="overflow-auto">
          <table class="w-full text-sm">
            <thead>
              <tr>
                <th class="text-left p-2">Role</th>
                <th class="text-left p-2">Description</th>
                <th v-for="k in DEFAULT_PERMISSION_KEYS" :key="k" class="text-left p-2">
                  {{ k }}
                </th>
                <th class="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in roles" :key="r.name" class="border-t" :class="'border-[var(--bb-border)]'">
                <td class="p-2 font-semibold">{{ r.label }}<span v-if="r.locked" class="bb-badge ml-2">core</span></td>
                <td class="p-2 text-muted">{{ r.description }}</td>
                <td v-for="k in DEFAULT_PERMISSION_KEYS" :key="r.name + '-' + k" class="p-2">
                  <label class="inline-flex items-center gap-2">
                    <input type="checkbox" :checked="!!r.permissions[k]" @change="togglePerm(r.name, k)" :disabled="r.locked && r.name==='admin' && k==='managePermissions'"/>
                    <span class="sr-only">{{ k }}</span>
                  </label>
                </td>
                <td class="p-2">
                  <button
                    class="bb-btn bb-btn--danger"
                    :disabled="r.locked"
                    @click="removeRole(r.name)"
                    title="Delete role"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="info" class="mt-3 text-green-700">{{ info }}</p>
        <p v-if="err" class="mt-3 text-red-600">{{ err }}</p>
      </section>

      <!-- Users & Role Assignment -->
      <section class="bb-card p-5">
        <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 class="text-xl font-semibold" style="font-family: var(--bb-font-heading);">Assign Roles to Users</h2>
            <p class="text-muted">Quickly update role membership.</p>
          </div>
          <input class="bb-input w-full md:w-64" v-model="search" placeholder="Search users by name or email…" />
        </div>

        <div class="overflow-auto">
          <table class="w-full text-sm">
            <thead>
              <tr>
                <th class="text-left p-2">Name</th>
                <th class="text-left p-2">Email</th>
                <th class="text-left p-2">Current Role</th>
                <th class="text-left p-2">Change Role</th>
                <th class="p-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="u in pagedUsers"
                :key="u._id"
                class="border-t"
                :class="'border-[var(--bb-border)]'"
              >
                <td class="p-2">{{ u.name || "—" }}</td>
                <td class="p-2 text-muted">{{ u.email }}</td>
                <td class="p-2">
                  <span class="bb-badge">{{ u.role || "user" }}</span>
                </td>
                <td class="p-2">
                  <select class="bb-select" v-model="u._nextRole">
                    <option v-for="opt in roleChoices" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </td>
                <td class="p-2">
                  <button
                    class="bb-btn bb-btn--primary"
                    :disabled="savingUser || (u._nextRole === (u.role || 'user'))"
                    @click="updateUserRole(u._id, u._nextRole || u.role || 'user')"
                  >
                    {{ savingUser ? "Saving…" : "Save" }}
                  </button>
                </td>
              </tr>
              <tr v-if="!pagedUsers.length">
                <td colspan="5" class="p-3 text-muted">No users match your search.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- simple pager -->
        <div class="flex items-center justify-center gap-3 mt-4">
          <button class="bb-btn bb-btn--ghost" :disabled="currentPage===1" @click="currentPage--">Prev</button>
          <span>Page {{ currentPage }}</span>
          <button
            class="bb-btn bb-btn--ghost"
            :disabled="currentPage * itemsPerPage >= filteredUsers.length"
            @click="currentPage++"
          >
            Next
          </button>
        </div>

        <p v-if="err" class="mt-3 text-red-600">{{ err }}</p>
        <p v-if="info" class="mt-3 text-green-700">{{ info }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* visuals come from brand.css; minimal local tweaks only */
table th, table td { border-color: var(--bb-border); }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
</style>
