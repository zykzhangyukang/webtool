<script setup>
import { ref, computed } from 'vue'
import { jwtDecode } from 'jwt-decode'

const token = ref('')

const result = computed(() => {
  const t = token.value.trim().replace(/^Bearer\s+/i, '')
  if (!t) return null
  try {
    const header = jwtDecode(t, { header: true })
    const payload = jwtDecode(t)
    const fmt = (s) => (s ? new Date(s * 1000).toLocaleString('sv') : null)
    const exp = payload.exp ? payload.exp * 1000 : null
    return {
      header,
      payload,
      times: [
        ['签发时间 iat', fmt(payload.iat)],
        ['生效时间 nbf', fmt(payload.nbf)],
        ['过期时间 exp', fmt(payload.exp)],
      ].filter(([, v]) => v),
      expired: exp === null ? null : exp < Date.now(),
    }
  } catch {
    return { error: '不是合法的 JWT' }
  }
})
const pretty = (o) => JSON.stringify(o, null, 2)
</script>

<template>
  <h1 class="h4 mb-3">JWT 解码</h1>
  <p class="text-body-secondary small">仅在浏览器本地解码,不会上传。这里不校验签名,请勿据此判断 token 是否可信。</p>
  <label class="form-label" for="jwt">JWT</label>
  <textarea id="jwt" v-model="token" class="form-control font-monospace mb-3" rows="5" spellcheck="false"></textarea>
  <div v-if="result?.error" class="alert alert-danger py-2">{{ result.error }}</div>
  <template v-else-if="result">
    <div v-if="result.expired !== null" class="alert py-2" :class="result.expired ? 'alert-warning' : 'alert-success'">
      {{ result.expired ? '已过期' : '未过期' }}
    </div>
    <ul v-if="result.times.length" class="list-unstyled small font-monospace">
      <li v-for="[k, v] in result.times" :key="k">{{ k }}:{{ v }}</li>
    </ul>
    <div class="row g-3">
      <div class="col-md-5">
        <label class="form-label">Header</label>
        <pre class="form-control font-monospace" style="min-height: 8rem">{{ pretty(result.header) }}</pre>
      </div>
      <div class="col-md-7">
        <label class="form-label">Payload</label>
        <pre class="form-control font-monospace" style="min-height: 8rem">{{ pretty(result.payload) }}</pre>
      </div>
    </div>
  </template>
</template>
