<template>
  <div class="p-6 space-y-6">
    <h2 class="text-2xl font-semibold">Account Activity</h2>

    <div v-if="loading" class="text-gray-500 dark:text-gray-300">Loading activity log...</div>

    <div v-else-if="activities.length === 0" class="text-gray-500 dark:text-gray-300">
      No recent activity found.
    </div>

    <ul v-else class="space-y-4 max-w-2xl">
      <li
        v-for="activity in activities"
        :key="activity._id"
        class="p-4 rounded-lg border dark:bg-gray-800"
      >
        <div class="flex justify-between items-start">
          <div>
            <p class="font-medium">{{ formatEvent(activity.event) }}</p>
            <p class="text-sm text-gray-500">IP: {{ activity.ip }} | Location: {{ activity.location || 'Unknown' }}</p>
          </div>
          <span class="text-xs text-gray-400">{{ formatDate(activity.timestamp) }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const activities = ref([])
const loading = ref(false)

const formatDate = (dateStr) => new Date(dateStr).toLocaleString()

const formatEvent = (event) => {
  const map = {
    login: 'Login',
    logout: 'Logout',
    password_change: 'Password Changed',
    enabled_2fa: '2FA Enabled',
    disabled_2fa: '2FA Disabled',
    new_device: 'New Device Login',
    session_terminated: 'Session Terminated'
  }
  return map[event] || event
}

const fetchActivity = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/api/user/activity')
    activities.value = data.activity || []
  } catch (err) {
    console.error('Failed to load activity log', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchActivity()
})
</script>
