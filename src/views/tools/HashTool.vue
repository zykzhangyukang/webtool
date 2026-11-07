<script setup>
import { ref, watch } from 'vue'
import SparkMD5 from 'spark-md5'
import { useCopy } from '../../tools/useCopy.js'

const input = ref('hello world')
const secret = ref('')
const upper = ref(false)
const results = ref([])
const { copied, copy } = useCopy()

const enc = new TextEncoder()
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')

async function sha(name, data) {
  if (!secret.value) return hex(await crypto.subtle.digest(name, data))
  const key = await crypto.subtle.importKey('raw', enc.encode(secret.value), { name: 'HMAC', hash: name }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, data))
}

// Web Crypto 不含 MD5:无密钥用 spark-md5,HMAC-MD5 手写 HMAC 结构
function md5Bytes(bytes) {
  const s = new SparkMD5.ArrayBuffer()
  s.append(bytes)
  return s.end(true)
}
function hmacMd5(key, data) {
  const bin = (str) => Uint8Array.from(str, (c) => c.charCodeAt(0))
  let k = key.length > 64 ? bin(md5Bytes(key)) : key
  const pad = (x) => Uint8Array.from({ length: 64 }, (_, i) => (k[i] ?? 0) ^ x)
  const cat = (a, b) => Uint8Array.from([...a, ...b])
  const inner = bin(md5Bytes(cat(pad(0x36), data)))
  return SparkMD5.ArrayBuffer.hash(cat(pad(0x5c), inner).buffer)
}

async function run() {
  const data = enc.encode(input.value)
  const md5 = secret.value ? hmacMd5(enc.encode(secret.value), data) : SparkMD5.ArrayBuffer.hash(data.buffer)
  const list = [['MD5', md5]]
  for (const [label, name] of [['SHA-1', 'SHA-1'], ['SHA-256', 'SHA-256'], ['SHA-384', 'SHA-384'], ['SHA-512', 'SHA-512']]) {
    list.push([label, await sha(name, data)])
  }
  results.value = list
}
watch([input, secret], run, { immediate: true })
const show = (v) => (upper.value ? v.toUpperCase() : v)
</script>

<template>
  <h1 class="h4 mb-3">哈希 / HMAC</h1>
  <p class="text-body-secondary small">输入即时计算。填写密钥后自动切换为 HMAC。全部在浏览器本地完成。</p>
  <label class="form-label" for="hin">输入文本</label>
  <textarea id="hin" v-model="input" class="form-control font-monospace mb-3" rows="5" spellcheck="false"></textarea>
  <div class="row g-2 mb-3 align-items-end">
    <div class="col-md">
      <label class="form-label" for="hkey">HMAC 密钥(可选)</label>
      <input id="hkey" v-model="secret" class="form-control font-monospace" spellcheck="false" />
    </div>
    <div class="col-auto form-check ms-2 mb-2">
      <input id="hup" v-model="upper" type="checkbox" class="form-check-input" />
      <label for="hup" class="form-check-label">大写</label>
    </div>
  </div>
  <div v-for="[name, v] in results" :key="name" class="input-group mb-2">
    <span class="input-group-text font-monospace" style="width: 6.5rem">{{ secret ? 'HMAC-' : '' }}{{ name }}</span>
    <input :value="show(v)" class="form-control font-monospace" readonly :aria-label="name" />
    <button class="btn btn-outline-secondary" @click="copy(show(v), name)">
      <i class="bi" :class="copied === name ? 'bi-check2' : 'bi-clipboard'"></i>
    </button>
  </div>
</template>
