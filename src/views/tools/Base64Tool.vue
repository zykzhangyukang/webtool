<script setup>
import { ref } from 'vue'
import { useCopy } from '../../tools/useCopy.js'

const input = ref('')
const output = ref('')
const error = ref('')
const urlSafe = ref(false)
const asHex = ref(false)
const { copied, copy } = useCopy()

const toBase64 = (bytes) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
const fromB64 = (s) => Uint8Array.from(atob(s.trim().replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

function show(bytes) {
  if (asHex.value) return toHex(bytes)
  let s = toBase64(bytes)
  if (urlSafe.value) s = s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return s
}

// 经 UTF-8 字节处理,避免中文报错
function encode() {
  error.value = ''
  output.value = show(new TextEncoder().encode(input.value))
}

function decode(hex) {
  error.value = ''
  try {
    const bytes = fromB64(input.value)
    output.value = hex ? toHex(bytes) : new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    error.value = hex ? '不是合法的 Base64' : '不是合法的 Base64 或不是 UTF-8 文本'
    output.value = ''
  }
}

// 文件 -> Base64(或 hex)
async function onFile(e) {
  const f = e.target.files[0]
  if (!f) return
  error.value = ''
  output.value = show(new Uint8Array(await f.arrayBuffer()))
}
</script>

<template>
  <h1 class="h4 mb-3">Base64 / Hex 编解码</h1>
  <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
    <button class="btn btn-primary" @click="encode">编码</button>
    <button class="btn btn-outline-primary" @click="decode(false)">解码为文本</button>
    <button class="btn btn-outline-primary" @click="decode(true)">解码为 Hex</button>
    <div class="form-check ms-2 mb-0">
      <input id="b64u" v-model="urlSafe" type="checkbox" class="form-check-input" :disabled="asHex" />
      <label for="b64u" class="form-check-label">URL-safe(无填充)</label>
    </div>
    <div class="form-check mb-0">
      <input id="b64h" v-model="asHex" type="checkbox" class="form-check-input" />
      <label for="b64h" class="form-check-label">编码输出 Hex</label>
    </div>
    <label class="btn btn-outline-secondary btn-sm mb-0 ms-auto">
      <i class="bi bi-file-earmark-arrow-up me-1"></i>选择文件
      <input type="file" hidden @change="onFile" />
    </label>
  </div>
  <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
  <div class="row g-3">
    <div class="col-md-6">
      <label class="form-label" for="in">输入</label>
      <textarea id="in" v-model="input" class="form-control font-monospace" rows="12" spellcheck="false"></textarea>
    </div>
    <div class="col-md-6">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <label class="form-label mb-0" for="out">输出</label>
        <button class="btn btn-sm btn-outline-secondary" :disabled="!output" @click="copy(output, 'o')">
          {{ copied === 'o' ? '已复制' : '复制' }}
        </button>
      </div>
      <textarea id="out" :value="output" class="form-control font-monospace" rows="12" readonly></textarea>
    </div>
  </div>
</template>
