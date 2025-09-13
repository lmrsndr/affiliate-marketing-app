<script setup>
import { ref, computed, onMounted } from "vue";
import API from "@/api";                         // axios with cookies + interceptor
import { guardedGet } from "@/lib/guarded-api";  // 401/403-safe GET

/* ────────────────────────────────────────────────────────────
   State
──────────────────────────────────────────────────────────── */
const invoices = ref([]);      // [{ _id, date, amount, category, fileUrl?, signedUrl? }]
const loading = ref(true);
const infoText = ref("");
const errorText = ref("");
const downloadingId = ref(null);

/* ────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────── */
const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const sortedInvoices = computed(() =>
  [...invoices.value].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
);

function showInfo(msg, ms = 2200) {
  infoText.value = msg;
  setTimeout(() => (infoText.value = ""), ms);
}
function showError(msg) { errorText.value = msg; }
function clearMsgs() { infoText.value = ""; errorText.value = ""; }

function filenameFor(inv) {
  const d = inv?.date ? new Date(inv.date) : null;
  const dd = d ? d.toISOString().slice(0, 10) : "invoice";
  return `invoice-${dd}-${inv?._id || "file"}.pdf`;
}

async function ensureSignedUrl(inv) {
  if (inv?.signedUrl) return inv.signedUrl;
  if (!inv?.fileUrl) return null;
  try {
    const { data } = await API.get("/accounting/signed-url", { params: { key: inv.fileUrl } });
    const url = data?.url || data?.signedUrl || null;
    if (url) inv.signedUrl = url;
    return url;
  } catch { return null; }
}

function triggerDownload(url, name, revoke = false) {
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", name || "invoice.pdf");
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (revoke) URL.revokeObjectURL(url);
}

/* ────────────────────────────────────────────────────────────
   Load
──────────────────────────────────────────────────────────── */
async function loadInvoices() {
  loading.value = true;
  clearMsgs();
  try {
    const data = await guardedGet("/accounting/my-invoices");
    invoices.value = Array.isArray(data) ? data : (data?.items || []);
    // opportunistically hydrate signed URLs if fileUrl exists
    await Promise.all(
      invoices.value.map(async (inv) => {
        if (inv.fileUrl && !inv.signedUrl) {
          try {
            const s = await ensureSignedUrl(inv);
            if (s) inv.signedUrl = s;
          } catch {}
        }
      })
    );
  } catch (e) {
    console.error("Failed to load invoices:", e?.response?.data || e);
    showError(e?.response?.data?.message || "Failed to load invoices.");
  } finally {
    loading.value = false;
  }
}

onMounted(loadInvoices);

/* ────────────────────────────────────────────────────────────
   Download
   Strategy:
   1) Use existing/fetched signed URL if available.
   2) GET /accounting/invoice/:id:
      - If JSON with { url }, use it
      - Else treat as PDF blob and force download
──────────────────────────────────────────────────────────── */
async function downloadInvoice(inv) {
  clearMsgs();
  downloadingId.value = inv._id;
  try {
    // 1) Signed URL path (fast path)
    const ready = (await ensureSignedUrl(inv)) || inv.signedUrl;
    if (ready) { triggerDownload(ready, filenameFor(inv)); showInfo("Download started."); return; }

    // 2a) Try JSON response (url handoff)
    try {
      const { data } = await API.get(`/accounting/invoice/${encodeURIComponent(inv._id)}`);
      if (data?.url) { triggerDownload(data.url, filenameFor(inv)); showInfo("Download started."); return; }
    } catch {
      // fall through to blob attempt
    }

    // 2b) Blob (PDF)
    const res = await API.get(`/accounting/invoice/${encodeURIComponent(inv._id)}`, { responseType: "blob" });
    const ctype = (res?.headers?.["content-type"] || "").toLowerCase();
    if (ctype.includes("application/json")) {
      // parse json-from-blob to find { url }
      const text = await res.data.text();
      const json = JSON.parse(text || "{}");
      if (json?.url) { triggerDownload(json.url, filenameFor(inv)); showInfo("Download started."); return; }
      throw new Error("Invalid JSON response for invoice.");
    }
    // assume PDF or generic blob
    const blobUrl = URL.createObjectURL(res.data);
    triggerDownload(blobUrl, filenameFor(inv), true);
    showInfo("Download started.");
  } catch (e) {
    console.error("Invoice download failed:", e?.response?.data || e);
    showError(e?.response?.data?.message || "Invoice download failed.");
  } finally {
    downloadingId.value = null;
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <header class="mb-4">
      <h2 class="text-2xl font-bold" style="font-family: var(--bb-font-heading);">Your Invoices</h2>
      <p class="text-muted">Download your monthly invoices anytime.</p>
    </header>

    <div v-if="loading" class="bb-card p-4" aria-busy="true">Loading…</div>

    <div v-else class="space-y-4">
      <p v-if="infoText" class="bb-card p-3 text-green-700">{{ infoText }}</p>
      <p v-if="errorText" class="bb-card p-3 text-red-600">{{ errorText }}</p>

      <section class="bb-card p-0 overflow-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b" :class="'border-[var(--bb-border)]'">
              <th class="text-left p-3">Date</th>
              <th class="text-left p-3">Amount</th>
              <th class="text-left p-3">Category</th>
              <th class="text-left p-3">File</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inv in sortedInvoices"
              :key="inv._id"
              class="border-b"
              :class="'border-[var(--bb-border)]'"
            >
              <td class="p-3">{{ inv.date ? new Date(inv.date).toLocaleDateString() : "—" }}</td>
              <td class="p-3">{{ GBP.format(Number(inv.amount || 0)) }}</td>
              <td class="p-3 text-muted">{{ inv.category || "Invoice" }}</td>
              <td class="p-3">
                <button
                  class="bb-btn bb-btn--primary"
                  :disabled="downloadingId === inv._id"
                  @click="downloadInvoice(inv)"
                >
                  {{ downloadingId === inv._id ? "Preparing…" : "Download" }}
                </button>
              </td>
            </tr>

            <tr v-if="!sortedInvoices.length">
              <td colspan="4" class="p-4 text-center text-muted">No invoices found.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* visuals come from brand.css; keep local tweaks minimal */
table th, table td { border-color: var(--bb-border); }
</style>
