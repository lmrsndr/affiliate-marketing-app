<template>
  <div class="bg-white p-6 rounded-xl shadow mb-6">
    <h2 class="text-2xl font-bold mb-4">📊 Expense Viewer</h2>

    <!-- 🔎 Filters -->
    <div class="flex flex-wrap gap-4 mb-4">
      <label>
        Month:
        <select v-model="selectedMonth" class="ml-2 border rounded px-2 py-1">
          <option value="">All</option>
          <option v-for="month in months" :key="month" :value="month">{{ month }}</option>
        </select>
      </label>

      <label>
        Category:
        <select v-model="selectedCategory" class="ml-2 border rounded px-2 py-1">
          <option value="">All</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </label>

      <label>
        Group by:
        <select v-model="groupBy" class="ml-2 border rounded px-2 py-1">
          <option value="">None</option>
          <option value="vendor">Vendor</option>
          <option value="category">Category</option>
        </select>
      </label>

      <!-- Export Buttons -->
      <div class="ml-auto flex gap-2">
        <button @click="exportCSV" class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Export CSV</button>
        <button @click="exportPDF" class="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600">Export PDF</button>
      </div>
    </div>

    <!-- 🔄 Grouped View -->
    <div v-if="groupBy">
      <div v-for="(group, key) in groupedExpenses" :key="key" class="mb-6">
        <h3 class="text-xl font-semibold mb-2">{{ key }} — £{{ group.total.toFixed(2) }}</h3>
        <ul class="space-y-2">
          <li v-for="exp in group.items" :key="exp._id" class="p-3 bg-slate-50 rounded flex justify-between items-center">
            <span>
              {{ new Date(exp.date).toLocaleDateString() }} | £{{ exp.amount }} | {{ exp.notes }}
            </span>
            <div class="flex gap-2">
              <button @click="editExpense(exp)" class="text-blue-600 hover:underline">Edit</button>
              <button @click="deleteExpense(exp._id)" class="text-red-600 hover:underline">Delete</button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- 📃 Default View -->
    <div v-else>
      <ul class="space-y-2">
        <li v-for="exp in filteredExpenses" :key="exp._id" class="p-3 bg-slate-50 rounded flex justify-between items-center">
          <span>
            {{ new Date(exp.date).toLocaleDateString() }} | £{{ exp.amount }} | {{ exp.vendor }} | {{ exp.category }}
          </span>
          <div class="flex gap-2">
            <button @click="editExpense(exp)" class="text-blue-600 hover:underline">Edit</button>
            <button @click="deleteExpense(exp._id)" class="text-red-600 hover:underline">Delete</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- ✏️ Edit Modal -->
    <div v-if="editingExpense" class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div class="bg-white rounded p-6 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">✏️ Edit Expense</h3>
        <input v-model="editForm.vendor" placeholder="Vendor" class="w-full mb-2 border p-2 rounded" />
        <input v-model.number="editForm.amount" placeholder="Amount (£)" type="number" step="0.01" class="w-full mb-2 border p-2 rounded" />
        <input v-model="editForm.category" placeholder="Category" class="w-full mb-2 border p-2 rounded" />
        <input v-model="editForm.date" type="date" class="w-full mb-2 border p-2 rounded" />
        <textarea v-model="editForm.notes" placeholder="Notes" class="w-full mb-2 border p-2 rounded"></textarea>

        <div class="flex justify-between mt-4">
          <button @click="saveEdit" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save</button>
          <button @click="editingExpense = null" class="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-600">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api'
import { saveAs } from 'file-saver'

const expenses = ref([])
const selectedMonth = ref('')
const selectedCategory = ref('')
const groupBy = ref('')
const editingExpense = ref(null)
const editForm = ref({})

onMounted(async () => {
  try {
    const { data } = await api.get('/accounting/report')
    expenses.value = data.expenses || []
  } catch (err) {
    console.error('Failed to load expenses:', err)
  }
})

const months = computed(() => {
  const uniqueMonths = new Set(
    expenses.value.map(e =>
      new Date(e.date).toLocaleString('default', { month: 'long', year: 'numeric' })
    )
  )
  return Array.from(uniqueMonths)
})

const categories = computed(() => {
  return Array.from(new Set(expenses.value.map(e => e.category))).filter(Boolean)
})

const filteredExpenses = computed(() =>
  expenses.value.filter(e => {
    const matchesMonth = selectedMonth.value
      ? new Date(e.date).toLocaleString('default', { month: 'long', year: 'numeric' }) === selectedMonth.value
      : true
    const matchesCategory = selectedCategory.value ? e.category === selectedCategory.value : true
    return matchesMonth && matchesCategory
  })
)

const groupedExpenses = computed(() => {
  const groups = {}
  filteredExpenses.value.forEach(exp => {
    const key = exp[groupBy.value]
    if (!groups[key]) groups[key] = { total: 0, items: [] }
    groups[key].total += exp.amount
    groups[key].items.push(exp)
  })
  return groups
})

const editExpense = (exp) => {
  editingExpense.value = exp
  editForm.value = { ...exp }
}

const saveEdit = async () => {
  try {
    const { _id, ...update } = editForm.value
    const { data } = await api.put(`/accounting/expense/${_id}`, update)
    const idx = expenses.value.findIndex(e => e._id === _id)
    if (idx !== -1) expenses.value[idx] = data.expense
    editingExpense.value = null
  } catch (err) {
    console.error('Failed to update expense:', err)
  }
}

const deleteExpense = async (id) => {
  if (!confirm('Are you sure you want to delete this expense?')) return
  try {
    await api.delete(`/accounting/expense/${id}`)
    expenses.value = expenses.value.filter(e => e._id !== id)
  } catch (err) {
    console.error('Failed to delete expense:', err)
  }
}

const exportCSV = async () => {
  try {
    const res = await api.get('/accounting/export', { responseType: 'blob' })
    saveAs(res.data, 'bundlebee-expenses.csv')
  } catch (err) {
    console.error('Failed to export CSV:', err)
  }
}

const exportPDF = async () => {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  let y = 10
  expenses.value.forEach((e, i) => {
    doc.text(`📅 ${e.date} | £${e.amount} | ${e.vendor} | ${e.category}`, 10, y)
    y += 10
    if (y > 280) {
      doc.addPage()
      y = 10
    }
  })

  doc.save('bundlebee-expenses.pdf')
}
</script>
