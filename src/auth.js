import { reactive } from 'vue'

export const auth = reactive({ user: null, registerOpen: false, loaded: false })

export async function api(path, { body } = {}) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`)
  return data
}

export async function loadStatus() {
  try {
    const data = await api('/api/status')
    auth.user = data.user
    auth.registerOpen = data.registerOpen
  } catch {
    auth.user = null
  } finally {
    auth.loaded = true
  }
}

export async function login(username, password) {
  const data = await api('/api/login', { body: { username, password } })
  auth.user = data.user
}

export async function register(username, password) {
  const data = await api('/api/register', { body: { username, password } })
  auth.user = data.user
  auth.registerOpen = false
}

export async function logout() {
  await api('/api/logout', { body: {} })
  auth.user = null
}
