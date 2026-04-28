<template>
  <div class="p-6">
    <h2 class="text-2xl font-semibold mb-4">General Settings</h2>
    <form @submit.prevent="handleSave" class="space-y-4 max-w-md">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Display Name</label>
        <input
          v-model="form.displayName"
          type="text"
          class="mt-1 w-full px-4 py-2 rounded-lg border dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
        <input
          :value="user.email"
          type="email"
          disabled
          class="mt-1 w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-700 dark:text-white cursor-not-allowed"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Bio</label>
        <textarea
          v-model="form.bio"
          rows="4"
          class="mt-1 w-full px-4 py-2 rounded-lg border dark:bg-gray-800 dark:text-white"
        />
      </div>

      <button
        type="submit"
        class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
        :disabled="loading"
      >
        {{ loading ? 'Saving...' : 'Save Changes' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const user = ref({})
const form = ref({
  displayName: '',
  bio: '',
})

const loading = ref(false)

onMounted(async () => {
  try {
    const { data } = await api.get('/user/profile')
    user.value = data || {}
    form.value.displayName = user.value.displayName || user.value.name || ''
    form.value.bio = user.value.bio || ''
  } catch (err) {
    console.error('Failed to load profile:', err)
  }
})

const handleSave = async () => {
  loading.value = true
  try {
    const { data } = await api.put('/user/profile', form.value)
    user.value = data.user || user.value
    alert('Profile updated successfully!')
  } catch (err) {
    console.error(err)
    alert('Failed to update profile.')
  } finally {
    loading.value = false
  }
}
</script>
