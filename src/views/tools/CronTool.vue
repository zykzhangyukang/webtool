<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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

// 距下一次触发的倒计时
const now = ref(Date.now())
let timer
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onUnmounted(() => clearInterval(timer))
const countdown = computed(() => {
  const first = result.value.runs?.[0]
  if (!first) return ''
  let s = Math.max(0, Math.round((new Date(first.replace(' ', 'T')).getTime() - now.value) / 1000))
  const d = Math.floor(s / 86400)
  s %= 86400
  const p = (n) => String(n).padStart(2, '0')
  return `${d ? d + ' 天 ' : ''}${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
})

// Spring 的 @Scheduled 只支持 6 位(秒 分 时 日 月 周)
const fieldCount = computed(() => expr.value.trim().split(/\s+/).filter(Boolean).length)
const snippets = computed(() => {
  const e = expr.value.trim().replace(/"/g, '\\"')
  return [
    ['Spring @Scheduled', `@Scheduled(cron = "${e}")\npublic void job() {\n    // ...\n}`],
    ['Quartz', `CronScheduleBuilder.cronSchedule("${e}")`],
  ]
})
const copied = ref('')
async function copy(text, key) {
  await navigator.clipboard.writeText(text)
  copied.value = key
  setTimeout(() => (copied.value = ''), 1200)
}
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
    <div class="alert alert-success py-2 d-flex justify-content-between flex-wrap gap-2">
      <span><i class="bi bi-chat-left-text me-2"></i>{{ result.desc }}</span>
      <span class="font-monospace">下次触发倒计时 {{ countdown }}</span>
    </div>
    <div v-if="fieldCount === 5" class="alert alert-warning py-2 small">
      这是标准 5 位格式(分 时 日 月 周)。Spring 的 @Scheduled 和 Quartz 需要 6 位,请在最前面补上秒位。
    </div>
    <div v-for="[name, code] in snippets" :key="name" class="mb-3">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="small text-body-secondary">{{ name }}</span>
        <button class="btn btn-sm btn-outline-secondary" @click="copy(code, name)">
          {{ copied === name ? '已复制' : '复制' }}
        </button>
      </div>
      <pre class="form-control font-monospace small mb-0">{{ code }}</pre>
    </div>
    <div class="d-flex align-items-center gap-2 mb-2">
      <label class="form-label mb-0" for="cnt">未来触发时间</label>
      <input id="cnt" v-model.number="count" type="number" min="1" max="50" class="form-control form-control-sm" style="width: 5rem" />
    </div>
    <ol class="list-group list-group-numbered">
      <li v-for="t in result.runs" :key="t" class="list-group-item font-monospace">{{ t }}</li>
    </ol>
  </template>
</template>
