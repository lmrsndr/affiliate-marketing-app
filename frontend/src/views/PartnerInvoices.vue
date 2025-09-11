<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const invoices = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const { data } = await api.get('/accounting/my-invoices')
    invoices.value = data
  } catch (err) {
    error.value = 'Failed to load invoices'
    console.error('❌ Failed to load invoices:', err)
  } finally {
    loading.value = false
  }
})

const downloadInvoice = async (invoice) => {
  try {
    const { data } = await api.get(`/accounting/invoice/${invoice._id}`)
    const link = document.createElement('a')
    link.href = data.url
    link.setAttribute('download', `invoice-${invoice._id}.pdf`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err) {
    console.error('❌ Failed to download invoice:', err)
    alert('Invoice download failed.')
  }
}
</script>

<template>
  <div class="p-4">
    <h3 class="text-xl font-semibold mb-4">📄 Your Invoices</h3>

    <div v-if="loading" class="text-gray-600">Loading...</div>
    <div v-else-if="error" class="text-red-600">{{ error }}</div>
    <div v-else-if="invoices.length === 0" class="text-gray-600">No invoices found.</div>

    <ul v-else class="space-y-2">
      <li
        v-for="inv in invoices"
        :key="inv._id"
        class="flex justify-between items-center bg-blue-50 p-3 rounded shadow-sm"
      >
        <span>
          {{ new Date(inv.date).toLocaleDateString() }} - £{{ inv.amount }} - {{ inv.category }}
        </span>
        <button
          @click="downloadInvoice(inv)"
          class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          Download
        </button>
      </li>
    </ul>
  </div>
</template>
