<script setup>
import { ref, computed } from 'vue'

const pattern = ref('(\\d{4})-(\\d{2})-(\\d{2})')
const flags = ref('g')
const text = ref('今天是 2026-11-08,明天是 2026-11-09。')

// Java 字符串字面量:反斜杠和双引号需转义
const javaLiteral = computed(() => `"${pattern.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)

const result = computed(() => {
  if (!pattern.value) return { matches: [] }
  try {
    const f = flags.value.includes('g') ? flags.value : flags.value + 'g'
    const re = new RegExp(pattern.value, f)
    const matches = []
    for (const m of text.value.matchAll(re)) {
      matches.push({ index: m.index, text: m[0], groups: m.slice(1) })
      if (matches.length >= 500) break
    }
    return { matches }
  } catch (e) {
    return { error: e.message }
  }
})

// 把匹配结果切成"普通/命中"片段用于高亮
const parts = computed(() => {
  const out = []
  let pos = 0
  for (const m of result.value.matches || []) {
    if (m.text === '') continue
    if (m.index > pos) out.push({ t: text.value.slice(pos, m.index), hit: false })
    out.push({ t: m.text, hit: true })
    pos = m.index + m.text.length
  }
  out.push({ t: text.value.slice(pos), hit: false })
  return out
})
</script>

<template>
  <h1 class="h4 mb-3">正则测试</h1>
  <p class="text-body-secondary small">使用浏览器的 JavaScript 正则引擎,与 Java 的少数语法(如 possessive 量词、\\p{...} 部分类别)可能不同。</p>
  <div class="row g-2 mb-2">
    <div class="col">
      <label class="form-label" for="pt">正则表达式</label>
      <input id="pt" v-model="pattern" class="form-control font-monospace" spellcheck="false" />
    </div>
    <div class="col-auto">
      <label class="form-label" for="fl">标志</label>
      <input id="fl" v-model="flags" class="form-control font-monospace" style="width: 6rem" spellcheck="false" />
    </div>
  </div>
  <div class="small mb-3">
    Java 字符串:<code>{{ javaLiteral }}</code>
  </div>
  <label class="form-label" for="tx">测试文本</label>
  <textarea id="tx" v-model="text" class="form-control font-monospace mb-3" rows="5" spellcheck="false"></textarea>
  <div v-if="result.error" class="alert alert-danger py-2">{{ result.error }}</div>
  <template v-else>
    <div class="form-label">高亮(共 {{ result.matches.length }} 处匹配)</div>
    <pre class="form-control font-monospace mb-3" style="white-space: pre-wrap"><template v-for="(p, i) in parts" :key="i"><mark v-if="p.hit">{{ p.t }}</mark><template v-else>{{ p.t }}</template></template></pre>
    <table v-if="result.matches.length" class="table table-sm font-monospace">
      <thead><tr><th>#</th><th>位置</th><th>匹配</th><th>分组</th></tr></thead>
      <tbody>
        <tr v-for="(m, i) in result.matches" :key="i">
          <td>{{ i + 1 }}</td>
          <td>{{ m.index }}</td>
          <td>{{ m.text }}</td>
          <td>{{ m.groups.map((g, n) => `$${n + 1}=${g}`).join('  ') }}</td>
        </tr>
      </tbody>
    </table>
  </template>
</template>
