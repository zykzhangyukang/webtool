<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { tools } from '../tools/registry'
import { auth } from '../auth'

const router = useRouter()
const open = ref(false)
const q = ref('')
const idx = ref(0)
const input = ref(null)

// 简单子序列模糊匹配:"jw" 能匹配 "JWT 解码"
function score(t, k) {
  const hay = `${t.name} ${t.id} ${t.desc} ${t.category}`.toLowerCase()
  if (hay.includes(k)) return 100 - hay.indexOf(k)
  let i = 0
  for (const ch of hay) if (ch === k[i]) i++
  return i === k.length ? 1 : 0
}

const results = computed(() => {
  const k = q.value.trim().toLowerCase()
  if (!k) return tools
  return tools
    .map((t) => [t, score(t, k)])
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
})

watch(q, () => (idx.value = 0))

async function show() {
  if (!auth.user) return
  open.value = true
  q.value = ''
  idx.value = 0
  await nextTick()
  input.value?.focus()
}
const hide = () => (open.value = false)

function go(t) {
  if (!t) return
  hide()
  router.push(`/tools/${t.id}`)
}

function onKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value ? hide() : show()
  } else if (open.value && e.key === 'Escape') hide()
}

function onInputKey(e) {
  if (e.isComposing) return
  const n = results.value.length
  if (e.key === 'ArrowDown') idx.value = (idx.value + 1) % (n || 1)
  else if (e.key === 'ArrowUp') idx.value = (idx.value - 1 + (n || 1)) % (n || 1)
  else if (e.key === 'Enter') go(results.value[idx.value])
  else return
  e.preventDefault()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="open" class="palette-mask" @mousedown.self="hide">
    <div class="palette card shadow-lg" role="dialog" aria-label="命令面板">
      <input
        ref="input"
        v-model="q"
        class="form-control form-control-lg border-0 border-bottom rounded-0"
        placeholder="跳转到工具...  (Esc 关闭)"
        autocomplete="off"
        spellcheck="false"
        @keydown="onInputKey"
      />
      <div class="list-group list-group-flush palette-list">
        <button
          v-for="(t, i) in results"
          :key="t.id"
          :class="['list-group-item', 'list-group-item-action', 'd-flex', 'align-items-center', 'gap-3', { active: i === idx }]"
          @mouseenter="idx = i"
          @click="go(t)"
        >
          <i :class="['bi', t.icon, 'fs-5']"></i>
          <span class="flex-grow-1">{{ t.name }}<small class="ms-2 opacity-75">{{ t.desc }}</small></span>
          <kbd v-if="i === idx">Enter</kbd>
        </button>
        <div v-if="!results.length" class="list-group-item text-body-secondary">没有匹配的工具</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.palette-mask {
  position: fixed; inset: 0; z-index: 3000; background: rgba(0, 0, 0, 0.45);
  display: flex; justify-content: center; align-items: flex-start; padding-top: 12vh;
}
.palette { width: min(640px, 92vw); overflow: hidden; }
.palette-list { max-height: 50vh; overflow-y: auto; }
</style>
