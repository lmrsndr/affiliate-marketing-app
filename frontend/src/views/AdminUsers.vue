<template>
  <div class="admin-users">
    <h2>Manage Users</h2>

    <!-- 🔍 Search and Filter -->
    <div class="filter-bar">
      <input v-model="searchQuery" placeholder="Search by name or email" />
      <select v-model="roleFilter">
        <option value="">All Roles</option>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <select v-model="statusFilter">
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>
    </div>

    <!-- 🧑‍💻 User Table -->
    <table v-if="paginatedUsers.length">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Title</th>
          <th>Badges</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in paginatedUsers" :key="user._id">
          <td>{{ user.name }}</td>
          <td>{{ user.email }}</td>
          <td>
            <select v-model="user.role" @change="updateUser(user)">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </td>
          <td>
            <input v-model="user.title" @blur="updateUser(user)" />
          </td>
          <td>
            <input v-model="user.badges" placeholder="Comma separated" @blur="updateUser(user)" />
          </td>
          <td>
            <span :class="user.suspended ? 'suspended' : 'active'">
              {{ user.suspended ? 'Suspended' : 'Active' }}
            </span>
          </td>
          <td>
            <button @click="toggleSuspend(user)">{{ user.suspended ? 'Unsuspend' : 'Suspend' }}</button>
            <button @click="deleteUser(user._id)" class="delete-btn">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else class="no-results">No users found.</p>

    <!-- 🔢 Pagination -->
    <div class="pagination-controls" v-if="totalPages > 1">
      <button :disabled="currentPage === 1" @click="currentPage--">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import API from "../api";

export default {
  name: "AdminUsers",
  setup() {
    const users = ref([]);
    const searchQuery = ref("");
    const roleFilter = ref("");
    const statusFilter = ref("");
    const error = ref("");
    const currentPage = ref(1);
    const itemsPerPage = 5;

    const fetchUsers = async () => {
      try {
        const res = await API.get("/user/all");
        users.value = res.data;
      } catch (err) {
        error.value = "Failed to load users.";
        console.error("❌ Fetch users error:", err);
      }
    };

    const updateUser = async (user) => {
      try {
        await API.patch(`/user/${user._id}`, {
          role: user.role,
          title: user.title,
          badges: user.badges,
        });
      } catch (err) {
        error.value = "Failed to update user.";
        console.error("❌ Update user error:", err);
      }
    };

    const toggleSuspend = async (user) => {
      try {
        await API.patch(`/user/${user._id}/suspend`, {
          suspended: !user.suspended,
        });
        user.suspended = !user.suspended;
      } catch (err) {
        error.value = "Failed to suspend user.";
        console.error("❌ Suspend toggle error:", err);
      }
    };

    const deleteUser = async (id) => {
      if (!confirm("Are you sure you want to delete this user?")) return;
      try {
        await API.delete(`/user/${id}`);
        users.value = users.value.filter((u) => u._id !== id);
      } catch (err) {
        error.value = "Failed to delete user.";
        console.error("❌ Delete user error:", err);
      }
    };

    const filteredUsers = computed(() => {
      return users.value.filter((u) => {
        const matchesSearch =
          u.name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.value.toLowerCase());
        const matchesRole = roleFilter.value ? u.role === roleFilter.value : true;
        const matchesStatus =
          statusFilter.value === "active"
            ? !u.suspended
            : statusFilter.value === "suspended"
            ? u.suspended
            : true;
        return matchesSearch && matchesRole && matchesStatus;
      });
    });

    const totalPages = computed(() =>
      Math.ceil(filteredUsers.value.length / itemsPerPage)
    );

    const paginatedUsers = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage;
      return filteredUsers.value.slice(start, start + itemsPerPage);
    });

    onMounted(fetchUsers);

    return {
      users,
      searchQuery,
      roleFilter,
      statusFilter,
      filteredUsers,
      paginatedUsers,
      currentPage,
      totalPages,
      error,
      updateUser,
      deleteUser,
      toggleSuspend,
    };
  },
};
</script>

<style scoped>
.admin-users {
  max-width: 1000px;
  margin: auto;
  padding: 20px;
}
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.filter-bar input,
.filter-bar select {
  padding: 8px;
  font-size: 1rem;
}
table {
  width: 100%;
  border-collapse: collapse;
}
thead {
  background-color: #f4f4f4;
}
th, td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ccc;
}
input[type="text"] {
  width: 100%;
}
button {
  padding: 6px 10px;
  margin-right: 5px;
  font-size: 0.9rem;
  cursor: pointer;
}
.delete-btn {
  background-color: #dc3545;
  color: white;
}
.delete-btn:hover {
  background-color: #c82333;
}
.active {
  color: green;
  font-weight: bold;
}
.suspended {
  color: gray;
  font-weight: bold;
}
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 12px;
}
.error {
  color: red;
  font-weight: bold;
  margin-top: 10px;
}
.no-results {
  text-align: center;
  margin-top: 20px;
  color: #666;
}
</style>

