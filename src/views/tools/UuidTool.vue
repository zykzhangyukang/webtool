<script setup>
import { ref, computed } from 'vue'
import { v4, v7 } from 'uuid'

const version = ref('v4')
const count = ref(5)
const dash = ref(true)
const upper = ref(false)
const seed = ref(0)

const list = computed(() => {
  seed.value // 依赖它,点击"重新生成"时刷新
  const gen = version.value === 'v7' ? v7 : v4
  return Array.from({ length: Math.min(Math.max(count.value || 1, 1), 100) }, () => {
    let s = gen()
    if (!dash.value) s = s.replaceAll('-', '')
    return upper.value ? s.toUpperCase() : s
  })
})

const copied = ref(false)
async function copy() {
  await navigator.clipboard.writeText(list.value.join('\n'))
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <h1 class="h4 mb-3">UUID 生成</h1>
  <div class="d-flex flex-wrap align-items-center gap-3 mb-3">
    <select v-model="version" class="form-select w-auto" aria-label="UUID 版本">
      <option value="v4">v4(随机)</option>
      <option value="v7">v7(按时间排序,适合做主键)</option>
    </select>
    <div class="d-flex align-items-center gap-2">
      <label for="cnt" class="mb-0">数量</label>
      <input id="cnt" v-model.number="count" type="number" min="1" max="100" class="form-control" style="width: 5.5rem" />
    </div>
    <div class="form-check mb-0">
      <input id="dash" v-model="dash" type="checkbox" class="form-check-input" />
      <label for="dash" class="form-check-label">带横线</label>
    </div>
    <div class="form-check mb-0">
      <input id="up" v-model="upper" type="checkbox" class="form-check-input" />
      <label for="up" class="form-check-label">大写</label>
    </div>
    <button class="btn btn-primary" @click="seed++"><i class="bi bi-arrow-repeat me-1"></i>重新生成</button>
    <button class="btn btn-outline-primary" @click="copy">
      <i class="bi me-1" :class="copied ? 'bi-check2' : 'bi-clipboard'"></i>{{ copied ? '已复制' : '复制全部' }}
    </button>
  </div>
  <textarea :value="list.join('\n')" class="form-control font-monospace" rows="10" readonly aria-label="生成结果"></textarea>
</template>
