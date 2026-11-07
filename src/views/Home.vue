<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { tools } from '../tools/registry'

const router = useRouter()
const keyword = ref('')
const active = ref(0)
const searchEl = ref(null)
const cardEls = ref({}) // id -> 元素

const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  return tools.filter((t) => !k || `${t.name}${t.desc}${t.category}${t.id}`.toLowerCase().includes(k))
})

const groups = computed(() => {
  const map = {}
  for (const t of filtered.value) (map[t.category] ||= []).push(t)
  return map
})

// 键盘顺序与屏幕上从上到下的分组顺序一致
const ordered = computed(() => Object.values(groups.value).flat())

watch(keyword, () => (active.value = 0))

function setActive(i) {
  active.value = i
  nextTick(() => cardEls.value[ordered.value[i]?.id]?.scrollIntoView({ block: 'nearest' }))
}

// 上下键:在屏幕上找正上方/正下方最近的一张卡片
function moveVertical(dir) {
  const cur = cardEls.value[ordered.value[active.value]?.id]
  if (!cur) return
  const c = cur.getBoundingClientRect()
  const cx = c.left + c.width / 2
  let best = -1
  let bestScore = Infinity
  ordered.value.forEach((t, i) => {
    const el = cardEls.value[t.id]
    if (!el || i === active.value) return
    const r = el.getBoundingClientRect()
    const dy = dir > 0 ? r.top - c.top : c.top - r.top
    if (dy <= 1) return // 只考虑目标方向上的卡片
    const score = dy * 10 + Math.abs(r.left + r.width / 2 - cx) // 先找最近的一行,再找水平最近
    if (score < bestScore) {
      bestScore = score
      best = i
    }
  })
  if (best >= 0) setActive(best)
}

function onKeydown(e) {
  const n = ordered.value.length
  if (e.isComposing || !n) return // 输入法组词时不拦截
  if (e.key === 'ArrowRight') setActive((active.value + 1) % n)
  else if (e.key === 'ArrowLeft') setActive((active.value - 1 + n) % n)
  else if (e.key === 'ArrowDown') moveVertical(1)
  else if (e.key === 'ArrowUp') moveVertical(-1)
  else if (e.key === 'Enter') router.push(`/tools/${ordered.value[active.value].id}`)
  else return
  e.preventDefault()
}

onMounted(() => searchEl.value?.focus())
</script>

<template>
  <div class="mb-4">
    <input
      ref="searchEl"
      v-model="keyword"
      class="form-control form-control-lg"
      placeholder="搜索工具,方向键选择,回车打开"
      aria-label="搜索工具"
      autocomplete="off"
      @keydown="onKeydown"
    />
  </div>
  <p v-if="!ordered.length" class="text-body-secondary">没有匹配的工具</p>
  <section v-for="(list, cat) in groups" :key="cat" class="mb-4">
    <h2 class="h6 text-body-secondary text-uppercase mb-3">{{ cat }}</h2>
    <div class="row g-3">
      <div v-for="t in list" :key="t.id" class="col-12 col-sm-6 col-lg-4">
        <router-link
          :ref="(el) => (cardEls[t.id] = el?.$el)"
          :to="`/tools/${t.id}`"
          :class="['card', 'h-100', 'text-decoration-none', 'shadow-sm', { 'tool-active': ordered[active]?.id === t.id }]"
          @mouseenter="active = ordered.findIndex((x) => x.id === t.id)"
        >
          <div class="card-body d-flex gap-3">
            <i :class="['bi', t.icon, 'fs-2', 'text-primary']"></i>
            <div>
              <div class="fw-semibold">{{ t.name }}</div>
              <div class="small text-body-secondary">{{ t.desc }}</div>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tool-active {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25) !important;
}
</style>
