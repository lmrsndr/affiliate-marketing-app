<template>
  <div class="p-6 space-y-8">
    <h2 class="text-2xl font-semibold mb-4">Active Sessions</h2>

    <div v-if="loading" class="text-gray-500 dark:text-gray-300">Loading sessions...</div>

    <div v-else-if="sessions.length === 0" class="text-gray-500 dark:text-gray-300">
      No active sessions found.
    </div>

    <ul v-else class="space-y-4">
      <li
        v-for="session in sessions"
        :key="session._id"
        class="flex justify-between items-center p-4 rounded-lg border dark:bg-gray-800"
      >
        <div>
          <p class="font-medium">{{ session.device }}</p>
          <p class="text-sm text-gray-500">IP: {{ session.ip }}</p>
          <p class="text-sm text-gray-500">Location: {{ session.location || 'Unknown' }}</p>
          <p class="text-xs text-gray-400">Last Active: {{ formatDate(session.lastActive) }}</p>
        </div>
        <button
          @click="logoutSession(session._id)"
          class="text-sm text-red-600 hover:underline"
        >
          Logout
        </button>
      </li>
    </ul>

    <button
      v-if="sessions.length > 1"
      @click="logoutAllSessions"
      class="text-sm text-red-600 hover:underline mt-4"
    >
      Logout All Other Sessions
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const sessions = ref([])
const loading = ref(false)

const formatDate = (date) => new Date(date).toLocaleString()

const fetchSessions = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/user/sessions')
    sessions.value = data.sessions || []
  } catch (err) {
    console.error('Failed to fetch sessions:', err)
  } finally {
    loading.value = false
  }
}

const logoutSession = async (id) => {
  try {
    await api.post('/user/logout-session', { sessionId: id })
    sessions.value = sessions.value.filter(s => s._id !== id)
  } catch (err) {
    console.error('Failed to logout session:', err)
    alert('Could not log out of the selected session.')
  }
}

const logoutAllSessions = async () => {
  try {
    await api.post('/user/logout-all')
    sessions.value = []
    alert('Logged out of all sessions.')
  } catch (err) {
    console.error('Failed to logout all sessions:', err)
    alert('Could not log out of all sessions.')
  }
}

onMounted(() => {
  fetchSessions()
})
</script>
