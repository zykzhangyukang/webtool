<script setup>
import SnippetBar from '../../components/SnippetBar.vue'
import { ref, computed, watch } from 'vue'
import { jwtDecode } from 'jwt-decode'
import { compactVerify, importSPKI, importX509, importJWK } from 'jose'

const token = ref('')
const secret = ref('')
const verify = ref({ state: '', text: '' }) // state: ok | bad | ''
const b64Secret = ref(false)

const cleanToken = () => token.value.trim().replace(/^Bearer\s+/i, '')

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

const alg = computed(() => result.value?.header?.alg || '')
const isHmac = computed(() => /^HS\d+$/.test(alg.value))
const isNone = computed(() => alg.value.toLowerCase() === 'none')

// 按算法准备验签密钥:HS* 用共享密钥,其余用 PEM 公钥 / 证书 / JWK
async function buildKey() {
  const s = secret.value.trim()
  if (isHmac.value) {
    if (!b64Secret.value) return new TextEncoder().encode(secret.value)
    return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
  }
  if (s.startsWith('{')) return importJWK(JSON.parse(s), alg.value)
  if (s.includes('BEGIN CERTIFICATE')) return importX509(s, alg.value)
  return importSPKI(s, alg.value)
}

let seq = 0
async function runVerify() {
  const id = ++seq
  verify.value = { state: '', text: '' }
  if (!result.value || result.value.error || !secret.value.trim()) return
  if (isNone.value) return (verify.value = { state: 'bad', text: 'alg 为 none,token 没有签名,不应被信任' })
  try {
    // 只校验签名,过期状态上面单独显示
    await compactVerify(cleanToken(), await buildKey(), { algorithms: [alg.value] })
    if (id === seq) verify.value = { state: 'ok', text: `签名有效(${alg.value})` }
  } catch (e) {
    if (id === seq) verify.value = { state: 'bad', text: `验签失败:${e.message}` }
  }
}
watch([token, secret, b64Secret], runVerify)
</script>

<template>
  <h1 class="h4 mb-3">JWT 解码</h1>
  <SnippetBar tool="jwt" :get-content="() => token.value" :set-content="(t) => (token.value = t)" />
  <p class="text-body-secondary small">全部在浏览器本地完成,不会上传。填写密钥或公钥后可验证签名。</p>
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
    <div class="mb-3">
      <label class="form-label" for="jkey">
        {{ isHmac ? `签名密钥(${alg},共享密钥)` : `验签公钥(${alg || '未知算法'}:PEM 公钥、X.509 证书或 JWK)` }}
      </label>
      <textarea id="jkey" v-model="secret" class="form-control font-monospace" :rows="isHmac ? 1 : 5" spellcheck="false"
        :placeholder="isHmac ? 'your-256-bit-secret' : '-----BEGIN PUBLIC KEY-----'"></textarea>
      <div v-if="isHmac" class="form-check mt-2">
        <input id="jb64" v-model="b64Secret" type="checkbox" class="form-check-input" />
        <label for="jb64" class="form-check-label">密钥是 Base64 编码</label>
      </div>
      <div v-if="verify.state" class="alert py-2 mt-2 mb-0" :class="verify.state === 'ok' ? 'alert-success' : 'alert-danger'">
        <i class="bi me-1" :class="verify.state === 'ok' ? 'bi-patch-check' : 'bi-x-octagon'"></i>{{ verify.text }}
      </div>
    </div>
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
