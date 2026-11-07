<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const ZONES = [
  { id: 'local', label: '本地时区' },
  { id: 'UTC', label: 'UTC' },
  { id: 'Asia/Shanghai', label: '北京 (UTC+8)' },
  { id: 'Asia/Tokyo', label: '东京 (UTC+9)' },
  { id: 'Europe/London', label: '伦敦' },
  { id: 'America/New_York', label: '纽约' },
  { id: 'America/Los_Angeles', label: '洛杉矶' },
]
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const zoneName = (z) => (z === 'local' ? localZone : z)

// 把毫秒时间戳按指定时区拆成各部分
function partsIn(ms, zone) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: zoneName(zone),
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const o = {}
  for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value
  return o
}

function fmtIn(ms, zone) {
  const o = partsIn(ms, zone)
  return `${o.year}-${o.month}-${o.day} ${o.hour}:${o.minute}:${o.second}`
}

// 指定时区的墙上时间 -> 毫秒时间戳
function wallToMs(y, mo, d, h, mi, s, zone) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  const offsetAt = (t) => {
    const o = partsIn(t, zone)
    return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute, +o.second) - Math.floor(t / 1000) * 1000
  }
  let ms = guess - offsetAt(guess)
  ms = guess - offsetAt(ms) // 再校正一次,处理夏令时边界
  return ms
}

const now = ref(Date.now())
let timer
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onUnmounted(() => clearInterval(timer))

const copied = ref('')
async function copy(text, key) {
  await navigator.clipboard.writeText(String(text))
  copied.value = key
  setTimeout(() => (copied.value = ''), 1200)
}

// 时间戳 -> 日期
const tsInput = ref('')
const tsUnit = ref('auto')
const tsZone = ref('local')

const tsResult = computed(() => {
  const raw = tsInput.value.trim()
  if (!raw) return null
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return { error: '请输入数字时间戳' }
  const n = Number(raw)
  let unit = tsUnit.value
  if (unit === 'auto') unit = Math.abs(n) < 1e11 ? 's' : 'ms' // 小于 1e11 视为秒
  const ms = unit === 's' ? n * 1000 : n
  const d = new Date(ms)
  if (isNaN(d)) return { error: '时间戳超出范围' }
  return {
    unit,
    text: fmtIn(ms, tsZone.value),
    iso: d.toISOString(),
    seconds: Math.floor(ms / 1000),
    millis: Math.floor(ms),
  }
})

// 日期 -> 时间戳。选择器的值是"所选时区"的墙上时间
const dateZone = ref('local')
const dateInput = ref(fmtIn(Date.now(), 'local').replace(' ', 'T'))
let prevZone = 'local'

function parseWall(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim())
  return m ? [m[1], m[2], m[3], m[4], m[5], m[6] ?? '0'].map(Number) : null
}

const dateResult = computed(() => {
  const w = parseWall(dateInput.value)
  if (!w) return null
  const ms = wallToMs(...w, dateZone.value)
  return { seconds: Math.floor(ms / 1000), millis: ms, iso: new Date(ms).toISOString() }
})

// 切换时区时保持时间点不变,只改显示的墙上时间
function zoneChanged() {
  const w = parseWall(dateInput.value)
  if (w) dateInput.value = fmtIn(wallToMs(...w, prevZone), dateZone.value).replace(' ', 'T')
  prevZone = dateZone.value
}

const setNow = () => (dateInput.value = fmtIn(Date.now(), dateZone.value).replace(' ', 'T'))
const useNowTs = () => (tsInput.value = String(Math.floor(Date.now() / 1000)))
</script>

<template>
  <h1 class="h4 mb-3">时间戳转换</h1>

  <div class="card mb-4">
    <div class="card-body d-flex flex-wrap gap-4 align-items-center">
      <div>
        <div class="small text-body-secondary">当前时间({{ localZone }})</div>
        <div class="font-monospace fs-5">{{ fmtIn(now, 'local') }}</div>
      </div>
      <div>
        <div class="small text-body-secondary">Unix 时间戳(秒)</div>
        <button class="btn btn-link p-0 font-monospace fs-5" @click="copy(Math.floor(now / 1000), 'ns')">
          {{ Math.floor(now / 1000) }}
          <i :class="['bi', 'ms-1', 'small', copied === 'ns' ? 'bi-check2' : 'bi-clipboard']"></i>
        </button>
      </div>
      <div>
        <div class="small text-body-secondary">毫秒</div>
        <button class="btn btn-link p-0 font-monospace fs-5" @click="copy(now, 'nm')">
          {{ now }}
          <i :class="['bi', 'ms-1', 'small', copied === 'nm' ? 'bi-check2' : 'bi-clipboard']"></i>
        </button>
      </div>
    </div>
  </div>

  <div class="row g-4">
    <div class="col-lg-6">
      <h2 class="h6">时间戳 → 日期</h2>
      <div class="input-group mb-2">
        <input v-model="tsInput" class="form-control font-monospace" placeholder="如 1700000000 或 1700000000000" aria-label="时间戳" />
        <button class="btn btn-outline-secondary" @click="useNowTs">现在</button>
      </div>
      <div class="d-flex gap-2 mb-3">
        <select v-model="tsUnit" class="form-select" aria-label="单位">
          <option value="auto">单位:自动识别</option>
          <option value="s">秒 (s)</option>
          <option value="ms">毫秒 (ms)</option>
        </select>
        <select v-model="tsZone" class="form-select" aria-label="时区">
          <option v-for="z in ZONES" :key="z.id" :value="z.id">{{ z.label }}</option>
        </select>
      </div>
      <div v-if="tsResult?.error" class="text-danger">{{ tsResult.error }}</div>
      <ul v-else-if="tsResult" class="list-group font-monospace">
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>{{ tsResult.text }}</span>
          <button class="btn btn-sm btn-outline-secondary" @click="copy(tsResult.text, 't1')">
            {{ copied === 't1' ? '已复制' : '复制' }}
          </button>
        </li>
        <li class="list-group-item small">ISO:{{ tsResult.iso }}</li>
        <li class="list-group-item small">按{{ tsResult.unit === 's' ? '秒' : '毫秒' }}解析 · 秒 {{ tsResult.seconds }} · 毫秒 {{ tsResult.millis }}</li>
      </ul>
    </div>

    <div class="col-lg-6">
      <h2 class="h6">日期 → 时间戳</h2>
      <div class="input-group mb-2">
        <input
          v-model="dateInput"
          type="datetime-local"
          step="1"
          class="form-control font-monospace"
          aria-label="选择日期时间"
        />
        <button class="btn btn-outline-secondary" @click="setNow">现在</button>
      </div>
      <select v-model="dateZone" class="form-select mb-3" aria-label="时区" @change="zoneChanged">
        <option v-for="z in ZONES" :key="z.id" :value="z.id">{{ z.label }}</option>
      </select>
      <div v-if="!dateResult" class="text-body-secondary">请选择完整的日期和时间</div>
      <ul v-else class="list-group font-monospace">
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>秒:{{ dateResult.seconds }}</span>
          <button class="btn btn-sm btn-outline-secondary" @click="copy(dateResult.seconds, 'd1')">
            {{ copied === 'd1' ? '已复制' : '复制' }}
          </button>
        </li>
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>毫秒:{{ dateResult.millis }}</span>
          <button class="btn btn-sm btn-outline-secondary" @click="copy(dateResult.millis, 'd2')">
            {{ copied === 'd2' ? '已复制' : '复制' }}
          </button>
        </li>
        <li class="list-group-item small">ISO:{{ dateResult.iso }}</li>
      </ul>
    </div>
  </div>
</template>
