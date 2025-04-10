<template>
  <div class="p-6 space-y-6 max-w-2xl">
    <h2 class="text-2xl font-semibold">Appearance Settings</h2>

    <form @submit.prevent="savePreferences" class="space-y-6">
      <!-- Theme Mode -->
      <div>
        <label class="block text-sm font-medium mb-1">Theme Mode</label>
        <select v-model="form.theme" class="w-full px-4 py-2 rounded-lg border dark:bg-gray-800 dark:text-white">
          <option value="system">System Default</option>
          <option value="light">Light Mode</option>
          <option value="dark">Dark Mode</option>
        </select>
      </div>

      <!-- Accent Color -->
      <div>
        <label class="block text-sm font-medium mb-1">Accent Color</label>
        <select v-model="form.accent" class="w-full px-4 py-2 rounded-lg border dark:bg-gray-800 dark:text-white">
          <option value="blue">Blue (Default)</option>
          <option value="green">Green</option>
          <option value="purple">Purple</option>
          <option value="pink">Pink</option>
          <option value="orange">Orange</option>
        </select>
      </div>

      <!-- Font Size -->
      <div>
        <label class="block text-sm font-medium mb-1">Font Size</label>
        <select v-model="form.fontSize" class="w-full px-4 py-2 rounded-lg border dark:bg-gray-800 dark:text-white">
          <option value="small">Small</option>
          <option value="medium">Medium (Default)</option>
          <option value="large">Large</option>
        </select>
      </div>

      <!-- Layout Density -->
      <div>
        <label class="block text-sm font-medium mb-1">Layout Density</label>
        <select v-model="form.density" class="w-full px-4 py-2 rounded-lg border dark:bg-gray-800 dark:text-white">
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
        </select>
      </div>

      <button
        type="submit"
        class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
        :disabled="saving"
      >
        {{ saving ? 'Saving...' : 'Save Preferences' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const form = ref({
  theme: 'system',
  accent: 'blue',
  fontSize: 'medium',
  density: 'comfortable'
})

const saving = ref(false)

const fetchPreferences = async () => {
  try {
    const { data } = await api.get('/api/user/appearance')
    Object.assign(form.value, data.preferences || {})
  } catch (err) {
    console.error('Failed to load appearance preferences', err)
  }
}

const savePreferences = async () => {
  saving.value = true
  try {
    await api.put('/api/user/appearance', form.value)
    alert('Appearance preferences saved.')
    // Optionally trigger theme update globally here
  } catch (err) {
    console.error('Failed to save appearance preferences', err)
    alert('Something went wrong.')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchPreferences()
})
</script>
