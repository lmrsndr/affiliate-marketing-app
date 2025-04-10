<script setup>
import { ref } from 'vue'
import api from '@/api'

const props = defineProps({
  transactions: {
    type: Array,
    required: true
  }
})

const loadingInvoice = ref(null)

const downloadInvoice = async (txnId) => {
  try {
    loadingInvoice.value = txnId

    // Request a signed URL from backend
    const res = await api.get(`/api/accounting/invoice/${txnId}`)

    if (!res.data?.url) {
      throw new Error("No invoice URL returned")
    }

    // Open the signed URL in a new tab
    window.open(res.data.url, "_blank")
  } catch (err) {
    console.error("❌ Error downloading invoice:", err)
    alert("Failed to download invoice. Please try again.")
  } finally {
    loadingInvoice.value = null
  }
}
</script>

<template>
  <div>
    <h3 class="text-xl font-semibold mb-2">📄 Revenue & Invoices</h3>
    <ul class="space-y-2">
      <li
        v-for="txn in transactions"
        :key="txn._id"
        class="p-3 bg-green-50 rounded shadow flex justify-between items-center"
      >
        <span>
          {{ new Date(txn.date).toLocaleDateString() }} | £{{ txn.amount }} | {{ txn.category }}
        </span>
        <button
          @click="downloadInvoice(txn._id)"
          class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          :disabled="loadingInvoice === txn._id"
        >
          {{ loadingInvoice === txn._id ? 'Loading...' : 'Download Invoice' }}
        </button>
      </li>
    </ul>
  </div>
</template>
