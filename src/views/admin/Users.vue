<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { api, auth } from '../../auth'
import { tools } from '../../tools/registry'
import SessionTable from '../../components/SessionTable.vue'

const tab = ref('users')
const users = ref([])
const audit = reactive({ items: [], total: 0, page: 1, size: 50 })
const sessions = ref([])
const error = ref('')
const msg = ref('')

// 按分类分组的工具
const groups = computed(() => {
  const g = {}
  for (const t of tools) (g[t.category] ||= []).push(t)
  return g
})
const presets = {
  full: { label: '完整使用', tools: () => tools.map((t) => t.id) },
  view: { label: '只读查看类', tools: () => ['json', 'timestamp'] },
  none: { label: '清空', tools: () => [] },
}

// 编辑表单:id 为空表示新建
const form = ref(null)
const toLocal = (ts) => (ts ? new Date(ts * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
const fromLocal = (s) => (s ? Math.floor(new Date(s).getTime() / 1000) : null)
const fmt = (ts) => (ts ? new Date(ts * 1000).toLocaleString() : '-')

function openForm(u) {
  error.value = ''
  form.value = u
    ? {
        id: u.id,
        username: u.username,
        role: u.role,
        tools: u.permissions === '*' ? tools.map((t) => t.id) : [...u.permissions.tools],
        expires: toLocal(u.expires_at),
      }
    : { id: null, username: '', password: '', role: 'user', tools: [], expires: '' }
}

function toggleGroup(items, on) {
  const ids = items.map((t) => t.id)
  form.value.tools = on
    ? [...new Set([...form.value.tools, ...ids])]
    : form.value.tools.filter((id) => !ids.includes(id))
}
const groupAll = (items) => items.every((t) => form.value.tools.includes(t.id))

async function loadUsers() {
  users.value = (await api('/api/admin/users')).users
}
async function loadAudit(page = 1) {
  Object.assign(audit, await api(`/api/admin/audit?page=${page}`))
}
async function loadSessions() {
  sessions.value = (await api('/api/admin/sessions')).sessions
}
function kickSession(s) {
  if (!confirm(`确定踢出 ${s.username} 的该设备?`)) return
  error.value = ''
  msg.value = ''
  api(`/api/admin/sessions/${s.sid}`, { method: 'DELETE' })
    .then(() => {
      msg.value = '已踢出'
      return loadSessions()
    })
    .catch((e) => (error.value = e.message))
}
async function run(fn, ok) {
  error.value = ''
  msg.value = ''
  try {
    await fn()
    if (ok) msg.value = ok
    await loadUsers()
  } catch (e) {
    error.value = e.message
  }
}

function save() {
  const f = form.value
  const permissions = f.role === 'admin' ? '*' : { tools: f.tools }
  const body = { role: f.role, permissions, expires_at: fromLocal(f.expires) }
  return run(async () => {
    if (f.id) await api(`/api/admin/users/${f.id}`, { method: 'PATCH', body })
    else await api('/api/admin/users', { body: { ...body, username: f.username, password: f.password } })
    form.value = null
  }, '已保存')
}
const toggleStatus = (u) =>
  run(() => api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { status: u.status === 'active' ? 'disabled' : 'active' } }), '状态已更新')
function resetPw(u) {
  const pw = prompt(`为 ${u.username} 设置新的临时密码(至少 8 位),用户下次登录需修改:`)
  if (pw) run(() => api(`/api/admin/users/${u.id}/reset-password`, { body: { password: pw } }), '密码已重置')
}
function remove(u) {
  if (confirm(`确定删除用户 ${u.username}?此操作不可恢复。`))
    run(() => api(`/api/admin/users/${u.id}`, { method: 'DELETE' }), '已删除')
}

const actionLabel = {
  'login.ok': '登录成功', 'login.fail': '登录失败', 'login.locked': '登录锁定',
  'user.create': '创建用户', 'user.update': '修改用户', 'user.disable': '停用用户', 'user.enable': '启用用户',
  'user.reset_password': '重置密码', 'user.change_password': '修改密码', 'user.delete': '删除用户',
  'session.revoke': '踢出自己的设备', 'session.revoke_others': '踢出其他设备', 'session.admin_kick': '管理员踢出会话',
}
const expired = (u) => u.expires_at && u.expires_at * 1000 <= Date.now()
const toolCount = (u) => (u.permissions === '*' ? '全部' : `${u.permissions.tools.length} 个`)

onMounted(() => run(loadUsers))
function showTab(t) {
  tab.value = t
  if (t === 'audit') loadAudit(1).catch((e) => (error.value = e.message))
  if (t === 'sessions') loadSessions().catch((e) => (error.value = e.message))
}
</script>

<template>
  <div>
    <div class="d-flex align-items-center mb-3">
      <h4 class="mb-0">用户管理</h4>
      <button v-if="tab === 'users'" class="btn btn-primary btn-sm ms-auto" @click="openForm(null)">
        <i class="bi bi-person-plus me-1"></i>新建用户
      </button>
    </div>
    <ul class="nav nav-tabs mb-3">
      <li class="nav-item"><button class="nav-link" :class="{ active: tab === 'users' }" @click="showTab('users')">用户</button></li>
      <li class="nav-item"><button class="nav-link" :class="{ active: tab === 'audit' }" @click="showTab('audit')">审计日志</button></li>
      <li class="nav-item"><button class="nav-link" :class="{ active: tab === 'sessions' }" @click="showTab('sessions')">在线会话</button></li>
    </ul>
    <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
    <div v-if="msg" class="alert alert-success py-2">{{ msg }}</div>

    <div v-if="tab === 'users'" class="table-responsive">
      <table class="table align-middle">
        <thead><tr><th>用户名</th><th>角色</th><th>工具</th><th>状态</th><th>到期</th><th class="text-end">操作</th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.username }}<span v-if="u.must_change_pw" class="badge text-bg-warning ms-2">待改密</span></td>
            <td>{{ u.role === 'admin' ? '管理员' : '用户' }}</td>
            <td>{{ toolCount(u) }}</td>
            <td>
              <span v-if="expired(u)" class="badge text-bg-secondary">已到期</span>
              <span v-else :class="['badge', u.status === 'active' ? 'text-bg-success' : 'text-bg-danger']">{{ u.status === 'active' ? '正常' : '已停用' }}</span>
            </td>
            <td>{{ u.expires_at ? fmt(u.expires_at) : '永久' }}</td>
            <td class="text-end text-nowrap">
              <button class="btn btn-sm btn-outline-secondary me-1" @click="openForm(u)">编辑</button>
              <template v-if="u.username !== auth.user.username">
                <button class="btn btn-sm btn-outline-secondary me-1" @click="toggleStatus(u)">{{ u.status === 'active' ? '停用' : '启用' }}</button>
                <button class="btn btn-sm btn-outline-secondary me-1" @click="resetPw(u)">重置密码</button>
                <button class="btn btn-sm btn-outline-danger" @click="remove(u)">删除</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <SessionTable v-else-if="tab === 'sessions'" :sessions="sessions" admin @kick="kickSession" />

    <div v-else>
      <div class="table-responsive">
        <table class="table table-sm">
          <thead><tr><th>时间</th><th>操作者</th><th>动作</th><th>对象</th><th>详情</th></tr></thead>
          <tbody>
            <tr v-for="a in audit.items" :key="a.id">
              <td class="text-nowrap">{{ fmt(a.ts) }}</td>
              <td>{{ a.actor || '-' }}</td>
              <td>{{ actionLabel[a.action] || a.action }}</td>
              <td>{{ a.target || '-' }}</td>
              <td class="small text-body-secondary text-break">{{ a.detail || '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <button class="btn btn-sm btn-outline-secondary" :disabled="audit.page <= 1" @click="loadAudit(audit.page - 1)">上一页</button>
        <span class="small">第 {{ audit.page }} 页 / 共 {{ audit.total }} 条</span>
        <button class="btn btn-sm btn-outline-secondary" :disabled="audit.page * audit.size >= audit.total" @click="loadAudit(audit.page + 1)">下一页</button>
      </div>
    </div>

    <div v-if="form" class="modal d-block" style="background: rgba(0,0,0,.5)" @click.self="form = null">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <form class="modal-content" @submit.prevent="save">
          <div class="modal-header">
            <h5 class="modal-title">{{ form.id ? `编辑 ${form.username}` : '新建用户' }}</h5>
            <button type="button" class="btn-close" aria-label="关闭" @click="form = null"></button>
          </div>
          <div class="modal-body">
            <div v-if="!form.id" class="row g-3 mb-3">
              <div class="col-md-6"><label class="form-label">用户名</label><input v-model="form.username" class="form-control" required /></div>
              <div class="col-md-6"><label class="form-label">临时密码(至少 8 位)</label><input v-model="form.password" type="password" class="form-control" minlength="8" autocomplete="new-password" required /></div>
            </div>
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label">角色</label>
                <select v-model="form.role" class="form-select" :disabled="form.username === auth.user.username">
                  <option value="user">用户</option><option value="admin">管理员(全部工具 + 用户管理)</option>
                </select>
              </div>
              <div class="col-md-6"><label class="form-label">到期时间(留空为永久)</label><input v-model="form.expires" type="datetime-local" class="form-control" /></div>
            </div>
            <div v-if="form.role !== 'admin'">
              <div class="d-flex align-items-center mb-2">
                <strong class="me-3">可用工具</strong>
                <button v-for="(p, k) in presets" :key="k" type="button" class="btn btn-sm btn-outline-secondary me-1" @click="form.tools = p.tools()">{{ p.label }}</button>
              </div>
              <div v-for="(items, cat) in groups" :key="cat" class="mb-2">
                <div class="form-check">
                  <input :id="`g-${cat}`" class="form-check-input" type="checkbox" :checked="groupAll(items)" @change="toggleGroup(items, $event.target.checked)" />
                  <label class="form-check-label fw-semibold" :for="`g-${cat}`">{{ cat }}</label>
                </div>
                <div class="ms-4 d-flex flex-wrap gap-3">
                  <div v-for="t in items" :key="t.id" class="form-check">
                    <input :id="`t-${t.id}`" v-model="form.tools" class="form-check-input" type="checkbox" :value="t.id" />
                    <label class="form-check-label" :for="`t-${t.id}`">{{ t.name }}</label>
                  </div>
                </div>
              </div>
              <div class="form-text">工具为纯前端功能,此处控制入口显示与访问;服务端强制校验的是用户管理等接口。</div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="form = null">取消</button>
            <button class="btn btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
