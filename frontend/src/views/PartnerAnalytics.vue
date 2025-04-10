<!-- views/PartnerAnalytics.vue -->
<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">📊 Your Partner Analytics</h1>
    <div v-if="loading">Loading analytics...</div>
    <div v-else>
      <p>Total Revenue: £{{ analytics.totalRevenue }}</p>
      <p>Clicks: {{ analytics.totalClicks }}</p>
      <p>Conversions: {{ analytics.totalConversions }}</p>
      <!-- You can add charts here next -->
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import API from '../api'

const analytics = ref({})
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await API.get('/api/partner/analytics')
    analytics.value = data
  } catch (err) {
    console.error('❌ Error fetching partner analytics:', err)
  } finally {
    loading.value = false
  }
})
</script>
