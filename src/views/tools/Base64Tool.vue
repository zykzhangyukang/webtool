<script setup>
import { ref } from 'vue'

const input = ref('')
const output = ref('')
const error = ref('')

// 经 UTF-8 字节处理,避免中文报错
function encode() {
  error.value = ''
  const bytes = new TextEncoder().encode(input.value)
  output.value = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
}

function decode() {
  error.value = ''
  try {
    const bin = atob(input.value.trim().replace(/-/g, '+').replace(/_/g, '/'))
    output.value = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  } catch {
    error.value = '不是合法的 Base64 或不是 UTF-8 文本'
    output.value = ''
  }
}
</script>

<template>
  <h1 class="h4 mb-3">Base64 编解码</h1>
  <div class="d-flex gap-2 mb-3">
    <button class="btn btn-primary" @click="encode">编码</button>
    <button class="btn btn-outline-primary" @click="decode">解码</button>
  </div>
  <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
  <div class="row g-3">
    <div class="col-md-6">
      <label class="form-label" for="in">输入</label>
      <textarea id="in" v-model="input" class="form-control font-monospace" rows="12" spellcheck="false"></textarea>
    </div>
    <div class="col-md-6">
      <label class="form-label" for="out">输出</label>
      <textarea id="out" :value="output" class="form-control font-monospace" rows="12" readonly></textarea>
    </div>
  </div>
</template>
