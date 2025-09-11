<template>
  <div style="max-width:820px;margin:2rem auto;padding:1rem;border:1px solid #333;border-radius:12px;background:#0b0b0b">
    <h2>Auth Debug</h2>
    <p><strong>Location:</strong> {{ href }}</p>
    <p><strong>Cookies:</strong> {{ cookies }}</p>

    <button @click="probe" :disabled="loading">Probe /auth/status</button>
    <pre v-if="result" style="white-space:pre-wrap;background:#000;padding:.75rem;border-radius:8px;border:1px dashed #333;margin-top:.75rem">
{{ result }}
    </pre>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
const href = ref('');
const cookies = ref('');
const result = ref('');
const loading = ref(false);

async function probe() {
  loading.value = true;
  try {
    const res = await fetch('/auth/status', { credentials: 'include' });
    const body = await res.json().catch(()=>null);
    console.log('📊 [/debug-auth] /auth/status ->', { ok: res.ok, status: res.status, body });
    result.value = JSON.stringify({ ok: res.ok, status: res.status, body }, null, 2);
  } catch (e) {
    console.error('❌ probe failed', e);
    result.value = String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  href.value = window.location.href;
  cookies.value = document.cookie;
  console.log('🌐 [/debug-auth] href:', href.value);
  console.log('🍪 [/debug-auth] cookies:', cookies.value);
});
</script>
