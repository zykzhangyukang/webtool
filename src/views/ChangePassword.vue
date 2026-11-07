<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, api } from '../auth'

const router = useRouter()
const oldPassword = ref('')
const newPassword = ref('')
const confirm = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  if (newPassword.value !== confirm.value) return (error.value = '两次输入的新密码不一致')
  busy.value = true
  try {
    await api('/api/change-password', { body: { oldPassword: oldPassword.value, newPassword: newPassword.value } })
    auth.user.must_change_pw = 0
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto" style="max-width: 420px">
    <h4 class="mb-3">修改密码</h4>
    <div v-if="auth.user?.must_change_pw" class="alert alert-warning">当前使用的是临时密码,请先设置新密码。</div>
    <form @submit.prevent="submit">
      <div class="mb-3">
        <label class="form-label" for="old">旧密码</label>
        <input id="old" v-model="oldPassword" type="password" class="form-control" autocomplete="current-password" required />
      </div>
      <div class="mb-3">
        <label class="form-label" for="new">新密码(8-128 位)</label>
        <input id="new" v-model="newPassword" type="password" class="form-control" minlength="8" autocomplete="new-password" required />
      </div>
      <div class="mb-3">
        <label class="form-label" for="cfm">确认新密码</label>
        <input id="cfm" v-model="confirm" type="password" class="form-control" autocomplete="new-password" required />
      </div>
      <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
      <button class="btn btn-primary" :disabled="busy">保存</button>
    </form>
  </div>
</template>
