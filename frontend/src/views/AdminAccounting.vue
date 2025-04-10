<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import RevenueExpenseChart from '@/components/RevenueExpenseChart.vue'
import ExpenseViewer from '@/components/ExpenseViewer.vue'

const revenue = ref([])
const expenses = ref([])

// 🔁 Expense Modal States
const showReuploadModal = ref(false)
const selectedExpense = ref(null)
const newFile = ref(null)
const uploading = ref(false)
const uploadError = ref(null)

// 📄 Invoice Modal States
const showInvoiceModal = ref(false)
const selectedInvoice = ref(null)
const newInvoiceFile = ref(null)
const uploadingInvoice = ref(false)
const invoiceError = ref(null)

onMounted(async () => {
  try {
    const res = await api.get('/api/accounting/report')
    revenue.value = res.data.revenue
    expenses.value = res.data.expenses

    // Signed URLs for expenses
    for (const exp of expenses.value) {
      if (exp.fileUrl) {
        const { data } = await api.get(`/api/accounting/signed-url`, {
          params: { key: exp.fileUrl }
        })
        exp.signedUrl = data.url
      }
    }

    // Signed URLs for revenue
    for (const txn of revenue.value) {
      if (txn.invoiceUrl) {
        const { data } = await api.get(`/api/accounting/signed-url`, {
          params: { key: txn.invoiceUrl }
        })
        txn.signedUrl = data.url
      }
    }
  } catch (err) {
    console.error('Failed to load accounting data:', err)
  }
})

// Expense reupload modal
const openReuploadModal = (expense) => {
  selectedExpense.value = expense
  newFile.value = null
  uploadError.value = null
  showReuploadModal.value = true
}

const handleFileChange = (event) => {
  newFile.value = event.target.files[0]
}

const reuploadFile = async () => {
  if (!newFile.value || !selectedExpense.value) return
  uploading.value = true
  uploadError.value = null

  try {
    const formData = new FormData()
    formData.append('file', newFile.value)

    const { data } = await api.put(
      `/api/accounting/expense/${selectedExpense.value._id}/reupload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )

    selectedExpense.value.fileUrl = data.fileUrl
    selectedExpense.value.fileAvailable = true

    const signed = await api.get(`/api/accounting/signed-url`, {
      params: { key: data.fileUrl }
    })
    selectedExpense.value.signedUrl = signed.data.url

    showReuploadModal.value = false
  } catch (err) {
    console.error(err)
    uploadError.value = 'Upload failed'
  } finally {
    uploading.value = false
  }
}

// Invoice reupload modal
const openInvoiceModal = (txn) => {
  selectedInvoice.value = txn
  newInvoiceFile.value = null
  invoiceError.value = null
  showInvoiceModal.value = true
}

const handleInvoiceFileChange = (event) => {
  newInvoiceFile.value = event.target.files[0]
}

const reuploadInvoice = async () => {
  if (!newInvoiceFile.value || !selectedInvoice.value) return
  uploadingInvoice.value = true
  invoiceError.value = null

  try {
    const formData = new FormData()
    formData.append('file', newInvoiceFile.value)

    const { data } = await api.put(
      `/api/accounting/transaction/${selectedInvoice.value._id}/reupload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )

    selectedInvoice.value.invoiceUrl = data.fileUrl
    selectedInvoice.value.fileAvailable = true

    const signed = await api.get(`/api/accounting/signed-url`, {
      params: { key: data.fileUrl }
    })
    selectedInvoice.value.signedUrl = signed.data.url

    showInvoiceModal.value = false
  } catch (err) {
    console.error(err)
    invoiceError.value = 'Upload failed'
  } finally {
    uploadingInvoice.value = false
  }
}
</script>

<template>
  <div class="p-6">
    <h2 class="text-2xl font-bold mb-6">📊 Admin Accounting Dashboard</h2>

    <!-- Chart -->
    <RevenueExpenseChart :revenueData="revenue" :expenseData="expenses" />

    <!-- Revenue List -->
    <section class="mt-8">
      <h3 class="text-xl font-semibold mb-2">Recent Revenue</h3>
      <ul class="space-y-2">
        <li
          v-for="txn in revenue"
          :key="txn._id"
          class="bg-green-50 p-3 rounded shadow-sm flex justify-between items-center"
        >
          <span>
            {{ new Date(txn.date).toLocaleDateString() }} - £{{ txn.amount }} - {{ txn.category }}
          </span>
          <template v-if="txn.fileAvailable && txn.signedUrl">
            <a :href="txn.signedUrl" target="_blank" class="text-blue-600 hover:underline">
              View Invoice
            </a>
          </template>
          <template v-else>
            <button
              class="text-red-600 underline hover:text-red-800"
              @click="openInvoiceModal(txn)"
            >
              Reupload Missing Invoice
            </button>
          </template>
        </li>
      </ul>
    </section>

    <!-- Expense List -->
    <section class="mt-8">
      <h3 class="text-xl font-semibold mb-2">Recent Expenses</h3>
      <ul class="space-y-2">
        <li
          v-for="exp in expenses"
          :key="exp._id"
          class="bg-red-50 p-3 rounded shadow-sm flex justify-between items-center"
        >
          <span>
            {{ new Date(exp.date).toLocaleDateString() }} - £{{ exp.amount }} - {{ exp.category }}
          </span>
          <template v-if="exp.fileAvailable && exp.signedUrl">
            <a :href="exp.signedUrl" target="_blank" class="text-blue-600 hover:underline">
              View Receipt
            </a>
          </template>
          <template v-else>
            <button
              class="text-red-600 underline hover:text-red-800"
              @click="openReuploadModal(exp)"
            >
              Reupload Missing File
            </button>
          </template>
        </li>
      </ul>
    </section>

    <!-- Upload Manager -->
    <section class="mt-12">
      <ExpenseViewer />
    </section>

    <!-- 📎 Expense Reupload Modal -->
    <div
      v-if="showReuploadModal"
      class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
    >
      <div class="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h3 class="text-xl font-semibold mb-4">Reupload Missing File</h3>
        <input type="file" @change="handleFileChange" class="mb-4" />
        <div class="flex justify-end gap-3">
          <button class="bg-gray-300 px-4 py-2 rounded" @click="showReuploadModal = false">
            Cancel
          </button>
          <button
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            @click="reuploadFile"
            :disabled="uploading"
          >
            {{ uploading ? 'Uploading...' : 'Reupload File' }}
          </button>
        </div>
        <p v-if="uploadError" class="text-red-600 mt-3">{{ uploadError }}</p>
      </div>
    </div>

    <!-- 🧾 Invoice Reupload Modal -->
    <div
      v-if="showInvoiceModal"
      class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
    >
      <div class="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h3 class="text-xl font-semibold mb-4">Reupload Missing Invoice</h3>
        <input type="file" @change="handleInvoiceFileChange" class="mb-4" />
        <div class="flex justify-end gap-3">
          <button class="bg-gray-300 px-4 py-2 rounded" @click="showInvoiceModal = false">
            Cancel
          </button>
          <button
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            @click="reuploadInvoice"
            :disabled="uploadingInvoice"
          >
            {{ uploadingInvoice ? 'Uploading...' : 'Reupload Invoice' }}
          </button>
        </div>
        <p v-if="invoiceError" class="text-red-600 mt-3">{{ invoiceError }}</p>
      </div>
    </div>
  </div>
</template>
