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
const showPw = ref(false)

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
  <div class="login-wrap">
    <div class="login-card card border-0 shadow">
      <div class="card-body p-4 p-sm-5">
        <div class="text-center mb-4">
          <div class="brand-icon mb-3"><i class="bi bi-tools"></i></div>
          <h1 class="h4 fw-semibold mb-1">{{ isRegister ? '创建管理员账号' : '欢迎回来' }}</h1>
          <p class="text-body-secondary small mb-0">
            {{
              isRegister ? '首次使用,注册的账号将成为管理员,之后注册入口自动关闭' : '登录后使用 WebTool 开发者工具箱'
            }}
          </p>
        </div>
        <form @submit.prevent="submit">
          <div class="mb-3">
            <label for="u" class="form-label small text-body-secondary">用户名</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-person"></i></span>
              <input id="u" v-model="username" class="form-control" autocomplete="username" autofocus required />
            </div>
          </div>
          <div class="mb-3">
            <label for="p" class="form-label small text-body-secondary">密码</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-lock"></i></span>
              <input
                id="p"
                v-model="password"
                :type="showPw ? 'text' : 'password'"
                class="form-control"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                minlength="8"
                required
              />
              <button
                type="button"
                class="btn btn-outline-secondary"
                :title="showPw ? '隐藏密码' : '显示密码'"
                :aria-label="showPw ? '隐藏密码' : '显示密码'"
                @click="showPw = !showPw"
              >
                <i :class="['bi', showPw ? 'bi-eye-slash' : 'bi-eye']"></i>
              </button>
            </div>
            <div v-if="isRegister" class="form-text">至少 8 位</div>
          </div>
          <div v-if="error" class="alert alert-danger py-2 small" role="alert">{{ error }}</div>
          <button class="btn btn-primary w-100 py-2 mt-2" :disabled="busy">
            <span v-if="busy" class="spinner-border spinner-border-sm me-2"></span>
            {{ isRegister ? '注册并登录' : '登录' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: calc(100vh - 150px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
  background:
    radial-gradient(520px circle at 15% 10%, rgba(13, 110, 253, 0.12), transparent 60%),
    radial-gradient(480px circle at 90% 90%, rgba(32, 201, 151, 0.1), transparent 60%);
}
.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: 14px;
  animation: login-in 0.35s ease-out both;
}
.brand-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #fff;
  border-radius: 14px;
  background: linear-gradient(135deg, #0d6efd, #20c997);
}
@keyframes login-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
