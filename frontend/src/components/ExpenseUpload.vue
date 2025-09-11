<script setup>
import { ref } from 'vue'
import api from '@/api'

const form = ref({
  vendor: '',
  amount: '',
  category: '',
  notes: '',
  date: new Date().toISOString().split('T')[0] // default to today
})
const file = ref(null)
const loading = ref(false)
const success = ref(false)
const error = ref(null)

const uploadExpense = async () => {
  error.value = null
  success.value = false
  loading.value = true

  try {
    const formData = new FormData()
    Object.entries(form.value).forEach(([key, val]) => formData.append(key, val))
    formData.append('file', file.value)

    await api.post('/accounting/expense', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    success.value = true
    form.value = {
      vendor: '',
      amount: '',
      category: '',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    }
    file.value = null
  } catch (err) {
    error.value = 'Failed to upload expense. Try again.'
    console.error(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-white p-4 rounded-xl shadow mb-6">
    <h3 class="text-xl font-semibold mb-4">📥 Upload Expense</h3>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input
        v-model="form.vendor"
        type="text"
        placeholder="Vendor (e.g. AWS, Cloudflare)"
        class="border p-2 rounded"
      />
      <input
        v-model="form.amount"
        type="number"
        step="0.01"
        placeholder="Amount (£)"
        class="border p-2 rounded"
      />
      <input
        v-model="form.category"
        type="text"
        placeholder="Category (e.g. Hosting, Fuel)"
        class="border p-2 rounded"
      />
      <input
        v-model="form.date"
        type="date"
        class="border p-2 rounded"
      />
      <textarea
        v-model="form.notes"
        placeholder="Notes (optional)"
        class="border p-2 rounded md:col-span-2"
      ></textarea>
      <input
        type="file"
        @change="e => file.value = e.target.files[0]"
        class="md:col-span-2"
      />
    </div>

    <div class="mt-4 flex gap-3">
      <button
        @click="uploadExpense"
        :disabled="loading"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {{ loading ? 'Uploading...' : 'Upload Expense' }}
      </button>

      <span v-if="success" class="text-green-600 font-semibold">✓ Uploaded!</span>
      <span v-if="error" class="text-red-600">{{ error }}</span>
    </div>
  </div>
</template>
