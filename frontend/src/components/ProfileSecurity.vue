<template>
  <div class="p-6 space-y-8">
    <h2 class="text-2xl font-semibold">Security Settings</h2>

    <!-- Change Password -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">Change Password</h3>
      <form @submit.prevent="handleChangePassword" class="space-y-3 max-w-md">
        <input v-model="passwordForm.currentPassword" type="password" placeholder="Current Password"
          class="w-full px-4 py-2 rounded-lg border dark:bg-gray-800 dark:text-white" />
        <input v-model="passwordForm.newPassword" type="password" placeholder="New Password"
          class="w-full px-4 py-2 rounded-lg border dark:bg-gray-800 dark:text-white" />
        <input v-model="passwordForm.confirmPassword" type="password" placeholder="Confirm New Password"
          class="w-full px-4 py-2 rounded-lg border dark:bg-gray-800 dark:text-white" />
        <button type="submit" class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
          :disabled="loadingPassword">
          {{ loadingPassword ? 'Updating...' : 'Update Password' }}
        </button>
      </form>
    </div>

    <!-- 2FA Toggle -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">Two-Factor Authentication</h3>
      <div>
        <p class="mb-2">2FA is currently <strong>{{ user.twoFactorEnabled ? 'enabled' : 'disabled' }}</strong>.</p>
        <button
          @click="toggle2FA"
          class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
          :disabled="loading2FA"
        >
          {{ loading2FA ? 'Updating...' : user.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA' }}
        </button>
      </div>
    </div>

    <!-- Active Sessions -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">Active Sessions</h3>
      <div v-if="sessions.length === 0">No active sessions.</div>
      <ul v-else class="space-y-2">
        <li
          v-for="session in sessions"
          :key="session._id"
          class="flex justify-between items-center p-3 rounded-lg border dark:bg-gray-800"
        >
          <div>
            <p>{{ session.device }} — {{ session.location }}</p>
            <p class="text-xs text-gray-500">Last active: {{ formatDate(session.lastActive) }}</p>
          </div>
          <button
            @click="logoutSession(session._id)"
            class="text-sm text-red-500 hover:underline"
          >
            Logout
          </button>
        </li>
      </ul>
      <button
        @click="logoutAllSessions"
        class="text-sm text-red-600 hover:underline"
      >
        Logout All Sessions
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const user = userStore.user

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const loadingPassword = ref(false)
const loading2FA = ref(false)
const sessions = ref([])

const formatDate = (dateStr) => new Date(dateStr).toLocaleString()

const handleChangePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    return alert('Passwords do not match.')
  }
  loadingPassword.value = true
  try {
    await api.post('/api/user/change-password', passwordForm.value)
    alert('Password updated successfully!')
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (err) {
    console.error(err)
    alert('Failed to update password.')
  } finally {
    loadingPassword.value = false
  }
}

const toggle2FA = async () => {
  loading2FA.value = true
  try {
    const { data } = await api.post('/api/user/toggle-2fa')
    userStore.setUser(data.user)
    alert(`2FA has been ${data.user.twoFactorEnabled ? 'enabled' : 'disabled'}.`)
  } catch (err) {
    console.error(err)
    alert('Failed to toggle 2FA.')
  } finally {
    loading2FA.value = false
  }
}

const fetchSessions = async () => {
  try {
    const { data } = await api.get('/api/user/sessions')
    sessions.value = data.sessions
  } catch (err) {
    console.error(err)
  }
}

const logoutSession = async (sessionId) => {
  try {
    await api.post(`/api/user/logout-session`, { sessionId })
    sessions.value = sessions.value.filter(s => s._id !== sessionId)
  } catch (err) {
    console.error(err)
    alert('Failed to logout session.')
  }
}

const logoutAllSessions = async () => {
  try {
    await api.post('/api/user/logout-all')
    sessions.value = []
    alert('All sessions have been logged out.')
  } catch (err) {
    console.error(err)
    alert('Failed to logout all sessions.')
  }
}

onMounted(() => {
  fetchSessions()
})
</script>
