<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../auth'
import SessionTable from '../components/SessionTable.vue'

const sessions = ref([])
const error = ref('')
const msg = ref('')

async function load() {
  sessions.value = (await api('/api/sessions')).sessions
}
async function run(fn, ok) {
  error.value = ''
  msg.value = ''
  try {
    await fn()
    if (ok) msg.value = ok
    await load()
  } catch (e) {
    error.value = e.message
  }
}
const kick = (s) => confirm('确定踢出该设备?') && run(() => api(`/api/sessions/${s.sid}`, { method: 'DELETE' }), '已踢出')
const revokeOthers = () =>
  confirm('确定踢出除当前设备外的所有设备?') && run(() => api('/api/sessions/revoke-others', { body: {} }), '已踢出其他设备')

onMounted(() => run(load))
</script>

<template>
  <div>
    <div class="d-flex align-items-center mb-3">
      <h4 class="mb-0">登录设备</h4>
      <button class="btn btn-outline-danger btn-sm ms-auto" :disabled="sessions.length < 2" @click="revokeOthers">
        踢出其他所有设备
      </button>
    </div>
    <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
    <div v-if="msg" class="alert alert-success py-2">{{ msg }}</div>
    <SessionTable :sessions="sessions" @kick="kick" />
  </div>
</template>
