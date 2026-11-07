<script setup>
import { ref, computed } from 'vue'
import { Cron } from 'croner'
import cronstrue from 'cronstrue/i18n'

const expr = ref('0 0/30 9-17 * * ?')
const count = ref(10)
const examples = [
  ['每 30 秒', '0/30 * * * * ?'],
  ['每天 12:00', '0 0 12 * * ?'],
  ['工作日 10:15', '0 15 10 ? * MON-FRI'],
  ['每月 1 号 0 点', '0 0 0 1 * ?'],
  ['每 5 分钟(标准 5 位)', '*/5 * * * *'],
]

// Quartz 的 "0/30" 等价于 "0-59/30",croner 只认后者
const MAX = [59, 59, 23, 31, 12, 7]
function normalize(text) {
  const f = text.trim().split(/\s+/)
  const off = f.length === 5 ? 1 : 0
  return f
    .map((x, i) => x.replace(/(^|,)(\d+)\/(\d+)/g, (m, p, a, s) => `${p}${a}-${MAX[i + off] ?? 59}/${s}`))
    .join(' ')
}

const result = computed(() => {
  if (!expr.value.trim()) return { error: '请输入 Cron 表达式' }
  try {
    const desc = cronstrue.toString(expr.value.trim(), { locale: 'zh_CN', use24HourTimeFormat: true })
    const runs = new Cron(normalize(expr.value), { legacyMode: true })
      .nextRuns(Math.min(Math.max(count.value, 1), 50))
      .map((d) => d.toLocaleString('sv'))
    return { desc, runs }
  } catch (e) {
    return { error: e.message }
  }
})
</script>

<template>
  <h1 class="h4 mb-3">Cron 表达式</h1>
  <p class="text-body-secondary small">支持 Quartz/Spring(6、7 位)和标准 5 位格式,时间为浏览器本地时区。</p>
  <label class="form-label" for="cron">表达式</label>
  <input id="cron" v-model="expr" class="form-control font-monospace mb-2" spellcheck="false" />
  <div class="d-flex flex-wrap gap-2 mb-3">
    <button v-for="[name, e] in examples" :key="e" class="btn btn-sm btn-outline-secondary" @click="expr = e">
      {{ name }}
    </button>
  </div>
  <div v-if="result.error" class="alert alert-danger py-2">{{ result.error }}</div>
  <template v-else>
    <div class="alert alert-success py-2"><i class="bi bi-chat-left-text me-2"></i>{{ result.desc }}</div>
    <div class="d-flex align-items-center gap-2 mb-2">
      <label class="form-label mb-0" for="cnt">未来触发时间</label>
      <input id="cnt" v-model.number="count" type="number" min="1" max="50" class="form-control form-control-sm" style="width: 5rem" />
    </div>
    <ol class="list-group list-group-numbered">
      <li v-for="t in result.runs" :key="t" class="list-group-item font-monospace">{{ t }}</li>
    </ol>
  </template>
</template>
