<script setup>
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  revenueData: {
    type: Array,
    default: () => []
  },
  expenseData: {
    type: Array,
    default: () => []
  }
})

// ✅ Format dates as "Apr 2025"
const getMonthYear = (dateStr) =>
  new Date(dateStr).toLocaleString("default", { month: "short", year: "numeric" })

// ✅ All unique months from revenue + expenses
const labels = [...new Set([
  ...props.revenueData.map(r => getMonthYear(r.date)),
  ...props.expenseData.map(e => getMonthYear(e.date))
])].sort((a, b) => {
  const [aMonth, aYear] = a.split(" ")
  const [bMonth, bYear] = b.split(" ")
  return new Date(`${aMonth} 1, ${aYear}`) - new Date(`${bMonth} 1, ${bYear}`)
})

// ✅ Monthly totals
const revenueByMonth = labels.map(label =>
  props.revenueData
    .filter(r => getMonthYear(r.date) === label)
    .reduce((sum, r) => sum + (r.amount || 0), 0)
)

const expenseByMonth = labels.map(label =>
  props.expenseData
    .filter(e => getMonthYear(e.date) === label)
    .reduce((sum, e) => sum + (e.amount || 0), 0)
)

const chartData = {
  labels,
  datasets: [
    {
      label: 'Revenue (£)',
      data: revenueByMonth,
      backgroundColor: '#22c55e'
    },
    {
      label: 'Expenses (£)',
      data: expenseByMonth,
      backgroundColor: '#ef4444'
    }
  ]
}

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top'
    },
    title: {
      display: true,
      text: 'Monthly Revenue vs. Expenses'
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
}
</script>

<template>
  <div class="bg-white p-4 rounded-xl shadow-md mb-6">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
