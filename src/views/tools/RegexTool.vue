<script setup>
import { ref, computed } from 'vue'

const pattern = ref('(\\d{4})-(\\d{2})-(\\d{2})')
const flagList = [
  ['g', '全局', ''],
  ['i', '忽略大小写', 'Pattern.CASE_INSENSITIVE'],
  ['m', '多行', 'Pattern.MULTILINE'],
  ['s', '. 匹配换行', 'Pattern.DOTALL'],
  ['u', 'Unicode', 'Pattern.UNICODE_CASE'],
]
const on = ref(['g'])
const flags = computed(() => on.value.join(''))
const replacement = ref('$3/$2/$1')
const text = ref('今天是 2026-11-08,明天是 2026-11-09。')

// Java 字符串字面量:反斜杠和双引号需转义
const javaLiteral = computed(() => `"${pattern.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
// 对应的 Java Pattern.compile 调用
const javaCode = computed(() => {
  const fl = flagList.filter(([k, , j]) => j && on.value.includes(k)).map(([, , j]) => j).join(' | ')
  return `Pattern p = Pattern.compile(${javaLiteral.value}${fl ? ', ' + fl : ''});`
})

const result = computed(() => {
  if (!pattern.value) return { matches: [] }
  try {
    const f = flags.value.includes('g') ? flags.value : flags.value + 'g'
    const re = new RegExp(pattern.value, f)
    const matches = []
    for (const m of text.value.matchAll(re)) {
      matches.push({ index: m.index, text: m[0], groups: m.slice(1), named: m.groups ? Object.entries(m.groups) : [] })
      if (matches.length >= 500) break
    }
    let replaced = ''
    if (replacement.value !== '') replaced = text.value.replace(re, replacement.value)
    return { matches, replaced }
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
  </div>
  <div class="d-flex flex-wrap gap-3 mb-2">
    <div v-for="[k, label] in flagList" :key="k" class="form-check mb-0">
      <input :id="'fl' + k" v-model="on" type="checkbox" :value="k" class="form-check-input" />
      <label :for="'fl' + k" class="form-check-label">{{ label }}<code class="ms-1">{{ k }}</code></label>
    </div>
  </div>
  <div class="small mb-3">
    Java:<code>{{ javaCode }}</code>
  </div>
  <label class="form-label" for="tx">测试文本</label>
  <textarea id="tx" v-model="text" class="form-control font-monospace mb-3" rows="5" spellcheck="false"></textarea>
  <div v-if="result.error" class="alert alert-danger py-2">{{ result.error }}</div>
  <template v-else>
    <div class="form-label">高亮(共 {{ result.matches.length }} 处匹配)</div>
    <pre class="form-control font-monospace mb-3" style="white-space: pre-wrap"><template v-for="(p, i) in parts" :key="i"><mark v-if="p.hit">{{ p.t }}</mark><template v-else>{{ p.t }}</template></template></pre>
    <table v-if="result.matches.length" class="table table-sm font-monospace">
      <thead><tr><th>#</th><th>位置</th><th>匹配</th><th>分组</th><th>命名分组</th></tr></thead>
      <tbody>
        <tr v-for="(m, i) in result.matches" :key="i">
          <td>{{ i + 1 }}</td>
          <td>{{ m.index }}</td>
          <td>{{ m.text }}</td>
          <td>{{ m.groups.map((g, n) => `$${n + 1}=${g}`).join('  ') }}</td>
          <td>{{ m.named.map(([k, v]) => `${k}=${v}`).join('  ') }}</td>
        </tr>
      </tbody>
    </table>
    <label class="form-label" for="rp">替换为(支持 $1、$&lt;name&gt;)</label>
    <input id="rp" v-model="replacement" class="form-control font-monospace mb-2" spellcheck="false" />
    <pre v-if="result.replaced" class="form-control font-monospace" style="white-space: pre-wrap">{{ result.replaced }}</pre>
  </template>
</template>
