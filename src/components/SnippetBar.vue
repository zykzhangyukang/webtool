<script setup>
import { ref, computed, onMounted } from 'vue'
import { api, auth } from '../auth'

// tool: 工具 id;getContent: 取当前内容;setContent: 载入片段
const props = defineProps({ tool: String, getContent: Function, setContent: Function })

const open = ref(false)
const items = ref([])
const used = ref(0)
const max = ref(0)
const msg = ref('')
const error = ref('')
const title = ref('')

const enabled = computed(() => (auth.user?.snippetMax ?? 0) > 0)
const fmt = (ts) => new Date(ts * 1000).toLocaleString()

async function load() {
  error.value = ''
  try {
    const d = await api(`/api/snippets?tool=${props.tool}`)
    items.value = d.items
    used.value = d.used
    max.value = d.max
  } catch (e) {
    error.value = e.message
  }
}
async function toggle() {
  open.value = !open.value
  if (open.value) await load()
}
async function save() {
  msg.value = ''
  error.value = ''
  const content = props.getContent()
  const t = title.value.trim() || content.trim().split('\n')[0].slice(0, 40)
  if (!content.trim()) return (error.value = '内容为空')
  try {
    await api('/api/snippets', { body: { tool: props.tool, title: t, content } })
    title.value = ''
    msg.value = '已保存'
    await load()
  } catch (e) {
    error.value = e.message
  }
}
async function use(it) {
  try {
    const d = await api(`/api/snippets/${it.id}`)
    props.setContent(d.content)
    msg.value = `已载入:${it.title}`
  } catch (e) {
    error.value = e.message
  }
}
async function remove(it) {
  if (!confirm(`删除片段「${it.title}」?`)) return
  try {
    await api(`/api/snippets/${it.id}`, { method: 'DELETE' })
    await load()
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <div v-if="enabled" class="mb-3">
    <button class="btn btn-sm btn-outline-secondary" :aria-expanded="open" @click="toggle">
      <i class="bi bi-bookmarks me-1"></i>片段库
    </button>
    <div v-if="open" class="card card-body mt-2">
      <div class="input-group input-group-sm mb-2">
        <input v-model="title" class="form-control" maxlength="80" placeholder="片段标题(留空取首行)" aria-label="片段标题" @keydown.enter="save" />
        <button class="btn btn-primary" @click="save">保存当前内容</button>
      </div>
      <div v-if="error" class="text-danger small mb-2">{{ error }}</div>
      <div v-else-if="msg" class="text-success small mb-2">{{ msg }}</div>
      <div v-if="!items.length" class="text-body-secondary small">暂无片段</div>
      <ul v-else class="list-group list-group-flush">
        <li v-for="it in items" :key="it.id" class="list-group-item d-flex align-items-center px-0">
          <button class="btn btn-link btn-sm text-start text-truncate flex-grow-1 p-0" @click="use(it)">{{ it.title }}</button>
          <span class="small text-body-secondary mx-3 d-none d-md-inline">{{ fmt(it.created_at) }}</span>
          <button class="btn btn-sm btn-outline-danger" aria-label="删除片段" @click="remove(it)"><i class="bi bi-trash"></i></button>
        </li>
      </ul>
      <div class="small text-body-secondary mt-2">已用 {{ used }} / {{ max }}</div>
    </div>
  </div>
</template>
