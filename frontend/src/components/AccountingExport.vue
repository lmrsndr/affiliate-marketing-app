<script setup>
import api from '@/api'
import { ref } from 'vue'

const downloading = ref(false)
const error = ref(null)

const downloadCSV = async () => {
  error.value = null
  downloading.value = true

  try {
    const res = await api.get('/accounting/export', {
      responseType: 'blob' // important for downloading files
    })

    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `bundlebee-accounting-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (err) {
    error.value = 'Failed to download export.'
    console.error(err)
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div class="bg-white p-4 rounded-xl shadow mb-6">
    <h3 class="text-xl font-semibold mb-2">📤 Download Accounting CSV</h3>
    <p class="text-sm text-gray-600 mb-2">Includes all revenue and expenses in one file.</p>

    <button
      @click="downloadCSV"
      :disabled="downloading"
      class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
    >
      {{ downloading ? 'Exporting...' : 'Download CSV' }}
    </button>

    <p v-if="error" class="text-red-500 mt-2">{{ error }}</p>
  </div>
</template>
