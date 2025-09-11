<template>
  <div class="p-6 max-w-2xl space-y-6">
    <h2 class="text-2xl font-semibold">Notification Settings</h2>

    <form @submit.prevent="saveSettings" class="space-y-6">
      <div v-for="(group, key) in notificationOptions" :key="key" class="space-y-2">
        <h3 class="text-lg font-medium">{{ group.label }}</h3>
        <div class="space-y-1">
          <div v-for="(option, field) in group.options" :key="field" class="flex items-center justify-between">
            <label class="text-sm dark:text-gray-200">{{ option.label }}</label>
            <input
              type="checkbox"
              v-model="form[field]"
              class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
          </div>
        </div>
        <hr class="my-4 border-gray-300 dark:border-gray-700" />
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

const saving = ref(false)
const form = ref({})

// Define notification groups and options
const notificationOptions = {
  activity: {
    label: 'Account Activity',
    options: {
      notifyOnLogin: { label: 'Notify on login from new device' },
      notifyOnPasswordChange: { label: 'Notify on password change' }
    }
  },
  marketing: {
    label: 'Marketing & Offers',
    options: {
      notifyOnPromotions: { label: 'Receive promotional emails' },
      notifyOnNewPartners: { label: 'Notify me about new partners' }
    }
  },
  engagement: {
    label: 'Engagement',
    options: {
      notifyOnCommentReplies: { label: 'Notify me when someone replies to my comment' },
      notifyOnReviewVotes: { label: 'Notify me when someone likes my review' }
    }
  }
}

const fetchPreferences = async () => {
  try {
    const { data } = await api.get('/user/notifications')
    form.value = data.preferences || {}
  } catch (err) {
    console.error('Failed to load notification preferences', err)
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    await api.put('/user/notifications', form.value)
    alert('Preferences saved successfully.')
  } catch (err) {
    console.error('Failed to save preferences', err)
    alert('Something went wrong.')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchPreferences()
})
</script>
