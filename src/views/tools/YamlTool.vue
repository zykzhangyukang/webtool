<script setup>
import { ref, computed } from 'vue'
import { parse, stringify } from 'yaml'
import { useCopy } from '../../tools/useCopy.js'

const input = ref('spring:\n  datasource:\n    url: jdbc:mysql://localhost:3306/demo\n    username: root\nserver:\n  port: 8080\n')
const mode = ref('yaml2json')
const { copied, copy } = useCopy()

const modes = [
  ['yaml2json', 'YAML → JSON'],
  ['json2yaml', 'JSON → YAML'],
  ['yaml2props', 'YAML → Properties'],
  ['props2yaml', 'Properties → YAML'],
]

// 展开成 a.b[0].c=value
function flatten(v, prefix = '', out = []) {
  if (v !== null && typeof v === 'object') {
    const entries = Array.isArray(v) ? v.map((x, i) => [`[${i}]`, x]) : Object.entries(v)
    for (const [k, x] of entries) flatten(x, prefix ? (k.startsWith('[') ? prefix + k : `${prefix}.${k}`) : k, out)
  } else out.push(`${prefix}=${v ?? ''}`)
  return out
}

// a.b[0].c=value 还原成嵌套对象
function unflatten(text) {
  const root = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('!')) continue
    const i = line.search(/[=:]/)
    if (i < 0) continue
    const keys = line.slice(0, i).trim().split(/\.|(?=\[)/).map((k) => k.replace(/^\[(\d+)\]$/, '$1'))
    const val = line.slice(i + 1).trim()
    let cur = root
    keys.forEach((k, n) => {
      if (n === keys.length - 1) return (cur[k] = val)
      cur = cur[k] ??= /^\d+$/.test(keys[n + 1]) ? [] : {}
    })
  }
  return root
}

const result = computed(() => {
  try {
    const s = input.value
    switch (mode.value) {
      case 'yaml2json': return { text: JSON.stringify(parse(s), null, 2) }
      case 'json2yaml': return { text: stringify(JSON.parse(s)) }
      case 'yaml2props': return { text: flatten(parse(s)).join('\n') }
      default: return { text: stringify(unflatten(s)) }
    }
  } catch (e) {
    return { error: e.message }
  }
})
</script>

<template>
  <h1 class="h4 mb-3">YAML / JSON / Properties</h1>
  <div class="btn-group mb-3" role="group" aria-label="转换方向">
    <button v-for="[k, label] in modes" :key="k" class="btn btn-outline-primary" :class="{ active: mode === k }" @click="mode = k">
      {{ label }}
    </button>
  </div>
  <div class="row g-3">
    <div class="col-lg-6">
      <label class="form-label" for="yin">输入</label>
      <textarea id="yin" v-model="input" class="form-control font-monospace" rows="16" spellcheck="false"></textarea>
    </div>
    <div class="col-lg-6">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="form-label mb-0">结果</span>
        <button class="btn btn-sm btn-outline-secondary" :disabled="!result.text" @click="copy(result.text, 'y')">
          {{ copied === 'y' ? '已复制' : '复制' }}
        </button>
      </div>
      <div v-if="result.error" class="alert alert-danger py-2 small" style="white-space: pre-wrap">{{ result.error }}</div>
      <pre v-else class="form-control font-monospace" style="min-height: 22rem">{{ result.text }}</pre>
    </div>
  </div>
</template>
