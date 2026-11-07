<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth, login, register } from '../auth'

const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

// 仅当库里还没有用户时才显示注册(首个用户即管理员)
const isRegister = computed(() => auth.registerOpen)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await (isRegister.value ? register : login)(username.value.trim(), password.value)
    const target = String(route.query.redirect || '/')
    // 只允许站内跳转
    router.replace(target.startsWith('/') && !target.startsWith('//') ? target : '/')
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="row justify-content-center">
    <div class="col-12 col-sm-8 col-md-5 col-lg-4">
      <div class="card shadow-sm">
        <div class="card-body p-4">
          <h1 class="h4 mb-1">{{ isRegister ? '创建管理员账号' : '管理员登录' }}</h1>
          <p v-if="isRegister" class="text-body-secondary small">
            首次使用,注册的账号将成为唯一管理员,之后注册入口自动关闭。
          </p>
          <form @submit.prevent="submit" class="mt-3">
            <div class="mb-3">
              <label for="u" class="form-label">用户名</label>
              <input id="u" v-model="username" class="form-control" autocomplete="username" required />
            </div>
            <div class="mb-3">
              <label for="p" class="form-label">密码</label>
              <input
                id="p"
                v-model="password"
                type="password"
                class="form-control"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                minlength="8"
                required
              />
              <div v-if="isRegister" class="form-text">至少 8 位</div>
            </div>
            <div v-if="error" class="alert alert-danger py-2" role="alert">{{ error }}</div>
            <button class="btn btn-primary w-100" :disabled="busy">
              {{ isRegister ? '注册并登录' : '登录' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
