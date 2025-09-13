<script setup>
import { ref, onMounted, computed } from "vue";
import { guardedGet, guardedPut } from "@/lib/guarded-api";
import RevenueExpenseChart from "@/components/RevenueExpenseChart.vue";
import ExpenseViewer from "@/components/ExpenseViewer.vue";

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const revenue = ref([]);
const expenses = ref([]);
const loading = ref(true);
const errorText = ref("");

/* Expense modal */
const showReuploadModal = ref(false);
const selectedExpense = ref(null);
const newFile = ref(null);
const uploading = ref(false);
const uploadError = ref("");

/* Invoice modal */
const showInvoiceModal = ref(false);
const selectedInvoice = ref(null);
const newInvoiceFile = ref(null);
const uploadingInvoice = ref(false);
const invoiceError = ref("");

/* Formatting helpers */
const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const fmtDate = (d) => new Date(d).toLocaleDateString();

/* Derived UI */
const hasData = computed(() => (revenue.value?.length || 0) + (expenses.value?.length || 0) > 0);

/* ────────────────────────────────────────────────────────────
   Data loading
──────────────────────────────────────────────────────────── */
async function loadReport() {
  loading.value = true;
  errorText.value = "";
  try {
    const data = await guardedGet("/accounting/report");
    // expecting { revenue: [...], expenses: [...] }
    revenue.value = data?.revenue ?? [];
    expenses.value = data?.expenses ?? [];

    // Signed URLs: do in parallel for speed
    const expenseJobs = expenses.value.map(async (exp) => {
      if (!exp.fileUrl) return;
      try {
        const signed = await guardedGet("/accounting/signed-url", { params: { key: exp.fileUrl } });
        exp.signedUrl = signed?.url || null;
      } catch (_) {}
    });

    const revenueJobs = revenue.value.map(async (txn) => {
      if (!txn.invoiceUrl) return;
      try {
        const signed = await guardedGet("/accounting/signed-url", { params: { key: txn.invoiceUrl } });
        txn.signedUrl = signed?.url || null;
      } catch (_) {}
    });

    await Promise.allSettled([...expenseJobs, ...revenueJobs]);
  } catch (e) {
    console.error("Failed to load accounting data:", e?.response?.data || e);
    errorText.value = e?.response?.data?.message || e?.message || "Failed to load data.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadReport);

/* ────────────────────────────────────────────────────────────
   Expense reupload
──────────────────────────────────────────────────────────── */
function openReuploadModal(expense) {
  selectedExpense.value = expense;
  newFile.value = null;
  uploadError.value = "";
  showReuploadModal.value = true;
}
function handleFileChange(e) {
  newFile.value = e.target.files?.[0] || null;
}
async function reuploadFile() {
  if (!newFile.value || !selectedExpense.value) return;
  uploading.value = true;
  uploadError.value = "";
  try {
    const formData = new FormData();
    formData.append("file", newFile.value);

    const data = await guardedPut(
      `/accounting/expense/${selectedExpense.value._id}/reupload`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    // update local row
    selectedExpense.value.fileUrl = data.fileUrl;
    selectedExpense.value.fileAvailable = true;

    const signed = await guardedGet("/accounting/signed-url", { params: { key: data.fileUrl } });
    selectedExpense.value.signedUrl = signed?.url || null;

    showReuploadModal.value = false;
  } catch (e) {
    console.error("Reupload expense failed:", e?.response?.data || e);
    uploadError.value = e?.response?.data?.message || "Upload failed";
  } finally {
    uploading.value = false;
  }
}

/* ────────────────────────────────────────────────────────────
   Invoice reupload
──────────────────────────────────────────────────────────── */
function openInvoiceModal(txn) {
  selectedInvoice.value = txn;
  newInvoiceFile.value = null;
  invoiceError.value = "";
  showInvoiceModal.value = true;
}
function handleInvoiceFileChange(e) {
  newInvoiceFile.value = e.target.files?.[0] || null;
}
async function reuploadInvoice() {
  if (!newInvoiceFile.value || !selectedInvoice.value) return;
  uploadingInvoice.value = true;
  invoiceError.value = "";
  try {
    const formData = new FormData();
    formData.append("file", newInvoiceFile.value);

    const data = await guardedPut(
      `/accounting/transaction/${selectedInvoice.value._id}/reupload`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    selectedInvoice.value.invoiceUrl = data.fileUrl;
    selectedInvoice.value.fileAvailable = true;

    const signed = await guardedGet("/accounting/signed-url", { params: { key: data.fileUrl } });
    selectedInvoice.value.signedUrl = signed?.url || null;

    showInvoiceModal.value = false;
  } catch (e) {
    console.error("Reupload invoice failed:", e?.response?.data || e);
    invoiceError.value = e?.response?.data?.message || "Upload failed";
  } finally {
    uploadingInvoice.value = false;
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8">
    <header class="mb-6">
      <h1 class="text-3xl font-bold" style="font-family: var(--bb-font-heading);">
        📊 Admin Accounting
      </h1>
      <p class="text-muted mt-1">Revenue & expenses overview with quick file management.</p>
    </header>

    <!-- Status -->
    <div v-if="loading" class="bb-card p-4 mb-6" aria-busy="true">
      Loading accounting data…
    </div>
    <div v-else-if="errorText" class="bb-card p-4 mb-6">
      <div class="text-red-600 font-semibold">Error</div>
      <div class="mt-1">{{ errorText }}</div>
      <button class="bb-btn bb-btn--ghost mt-3" @click="loadReport">Retry</button>
    </div>

    <!-- Chart -->
    <div v-else class="space-y-8">
      <div class="bb-card p-4">
        <RevenueExpenseChart :revenueData="revenue" :expenseData="expenses" />
      </div>

      <!-- Revenue -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold" style="font-family: var(--bb-font-heading);">
            Recent Revenue
          </h2>
          <span class="bb-badge">Items: {{ revenue.length }}</span>
        </div>

        <div v-if="!revenue.length" class="bb-card p-4 text-muted">
          No revenue recorded yet.
        </div>

        <ul v-else class="space-y-2">
          <li
            v-for="txn in revenue"
            :key="txn._id"
            class="bb-card bb-card--hover p-3 flex items-center justify-between"
          >
            <div class="space-y-0.5">
              <div class="font-semibold">
                {{ fmtDate(txn.date) }} · {{ gbp.format(Number(txn.amount || 0)) }}
              </div>
              <div class="text-muted text-sm">
                {{ txn.category || "Uncategorized" }}
              </div>
            </div>

            <div>
              <a
                v-if="txn.fileAvailable && txn.signedUrl"
                :href="txn.signedUrl"
                target="_blank"
                class="bb-btn bb-btn--ghost"
                rel="noopener"
              >View invoice</a>

              <button
                v-else
                class="bb-btn bb-btn--primary"
                @click="openInvoiceModal(txn)"
              >Reupload invoice</button>
            </div>
          </li>
        </ul>
      </section>

      <!-- Expenses -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold" style="font-family: var(--bb-font-heading);">
            Recent Expenses
          </h2>
          <span class="bb-badge">Items: {{ expenses.length }}</span>
        </div>

        <div v-if="!expenses.length" class="bb-card p-4 text-muted">
          No expenses recorded yet.
        </div>

        <ul v-else class="space-y-2">
          <li
            v-for="exp in expenses"
            :key="exp._id"
            class="bb-card bb-card--hover p-3 flex items-center justify-between"
          >
            <div class="space-y-0.5">
              <div class="font-semibold">
                {{ fmtDate(exp.date) }} · {{ gbp.format(Number(exp.amount || 0)) }}
              </div>
              <div class="text-muted text-sm">
                {{ exp.category || "Uncategorized" }}
              </div>
            </div>

            <div>
              <a
                v-if="exp.fileAvailable && exp.signedUrl"
                :href="exp.signedUrl"
                target="_blank"
                class="bb-btn bb-btn--ghost"
                rel="noopener"
              >View receipt</a>

              <button
                v-else
                class="bb-btn bb-btn--primary"
                @click="openReuploadModal(exp)"
              >Reupload file</button>
            </div>
          </li>
        </ul>
      </section>

      <!-- Upload Manager (existing component) -->
      <section>
        <div class="bb-card p-4">
          <ExpenseViewer />
        </div>
      </section>
    </div>

    <!-- Expense Reupload Modal -->
    <div
      v-if="showReuploadModal"
      class="fixed inset-0 z-50 grid place-items-center"
      style="background: rgba(0,0,0,.45);"
    >
      <div class="bb-card p-5 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-3" style="font-family: var(--bb-font-heading);">
          Reupload missing file
        </h3>

        <input type="file" class="bb-input mb-3" @change="handleFileChange" />
        <div class="flex justify-end gap-2">
          <button class="bb-btn bb-btn--ghost" @click="showReuploadModal = false">Cancel</button>
          <button class="bb-btn bb-btn--primary" :disabled="uploading" @click="reuploadFile">
            {{ uploading ? "Uploading…" : "Reupload" }}
          </button>
        </div>
        <p v-if="uploadError" class="text-red-600 mt-3">{{ uploadError }}</p>
      </div>
    </div>

    <!-- Invoice Reupload Modal -->
    <div
      v-if="showInvoiceModal"
      class="fixed inset-0 z-50 grid place-items-center"
      style="background: rgba(0,0,0,.45);"
    >
      <div class="bb-card p-5 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-3" style="font-family: var(--bb-font-heading);">
          Reupload missing invoice
        </h3>

        <input type="file" class="bb-input mb-3" @change="handleInvoiceFileChange" />
        <div class="flex justify-end gap-2">
          <button class="bb-btn bb-btn--ghost" @click="showInvoiceModal = false">Cancel</button>
          <button class="bb-btn bb-btn--primary" :disabled="uploadingInvoice" @click="reuploadInvoice">
            {{ uploadingInvoice ? "Uploading…" : "Reupload" }}
          </button>
        </div>
        <p v-if="invoiceError" class="text-red-600 mt-3">{{ invoiceError }}</p>
      </div>
    </div>
  </div>
</template>
