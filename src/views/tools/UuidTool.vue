<script setup>
import { ref, computed } from 'vue'
import { v4, v7 } from 'uuid'
import { ulid } from 'ulid'
import { nanoid } from 'nanoid'
import { useCopy } from '../../tools/useCopy.js'

const version = ref('v4')
const count = ref(5)
const dash = ref(true)
const upper = ref(false)
const seed = ref(0)
const size = ref(21)

const list = computed(() => {
  seed.value // 依赖它,点击"重新生成"时刷新
  const gen = { v4, v7, ulid: () => ulid(), nanoid: () => nanoid(size.value || 21) }[version.value]
  const isUuid = version.value === 'v4' || version.value === 'v7'
  return Array.from({ length: Math.min(Math.max(count.value || 1, 1), 100) }, () => {
    let s = gen()
    if (isUuid && !dash.value) s = s.replaceAll('-', '')
    return upper.value ? s.toUpperCase() : s
  })
})

const { copied, copy } = useCopy()
</script>

<template>
  <h1 class="h4 mb-3">UUID / ULID / NanoID</h1>
  <div class="d-flex flex-wrap align-items-center gap-3 mb-3">
    <select v-model="version" class="form-select w-auto" aria-label="类型">
      <option value="v4">v4(随机)</option>
      <option value="v7">v7(按时间排序,适合做主键)</option>
      <option value="ulid">ULID(26 位,按时间排序)</option>
      <option value="nanoid">NanoID(URL 友好)</option>
    </select>
    <div v-if="version === 'nanoid'" class="d-flex align-items-center gap-2">
      <label for="nsz" class="mb-0">长度</label>
      <input id="nsz" v-model.number="size" type="number" min="4" max="64" class="form-control" style="width: 5rem" />
    </div>
    <div class="d-flex align-items-center gap-2">
      <label for="cnt" class="mb-0">数量</label>
      <input id="cnt" v-model.number="count" type="number" min="1" max="100" class="form-control" style="width: 5.5rem" />
    </div>
    <div v-if="version === 'v4' || version === 'v7'" class="form-check mb-0">
      <input id="dash" v-model="dash" type="checkbox" class="form-check-input" />
      <label for="dash" class="form-check-label">带横线</label>
    </div>
    <div class="form-check mb-0">
      <input id="up" v-model="upper" type="checkbox" class="form-check-input" />
      <label for="up" class="form-check-label">大写</label>
    </div>
    <button class="btn btn-primary" @click="seed++"><i class="bi bi-arrow-repeat me-1"></i>重新生成</button>
    <button class="btn btn-outline-primary" @click="copy(list.join('\n'), 'all')">
      <i class="bi me-1" :class="copied === 'all' ? 'bi-check2' : 'bi-clipboard'"></i>{{ copied === 'all' ? '已复制' : '复制全部' }}
    </button>
  </div>
  <ul class="list-group">
    <li v-for="(id, i) in list" :key="i" class="list-group-item d-flex justify-content-between align-items-center font-monospace">
      {{ id }}
      <button class="btn btn-sm btn-outline-secondary" :aria-label="'复制 ' + id" @click="copy(id, id + i)">
        <i class="bi" :class="copied === id + i ? 'bi-check2' : 'bi-clipboard'"></i>
      </button>
    </li>
  </ul>
</template>
