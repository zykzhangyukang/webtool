<script setup>
import { useRouter } from 'vue-router'
import { auth, nav, logout } from './auth'
import { theme, cycleTheme } from './theme'
import CommandPalette from './components/CommandPalette.vue'

const themeIcon = { auto: 'bi-circle-half', light: 'bi-sun', dark: 'bi-moon-stars' }
const themeLabel = { auto: '跟随系统', light: '浅色', dark: '深色' }

const router = useRouter()

async function onLogout() {
  await logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div v-if="nav.loading" class="nav-progress"></div>
  <CommandPalette />
  <nav class="navbar navbar-expand bg-body-tertiary border-bottom">
    <div class="container">
      <router-link class="navbar-brand fw-semibold" to="/">
        <i class="bi bi-tools me-2"></i>WebTool
      </router-link>
      <div class="ms-auto d-flex align-items-center gap-3">
        <button
          class="btn btn-sm btn-outline-secondary"
          :title="`主题:${themeLabel[theme.mode]}(点击切换)`"
          :aria-label="`主题:${themeLabel[theme.mode]}`"
          @click="cycleTheme"
        >
          <i :class="['bi', themeIcon[theme.mode]]"></i>
        </button>
        <kbd v-if="auth.user" class="d-none d-md-inline" title="命令面板">Ctrl K</kbd>
      </div>
      <div v-if="auth.user" class="ms-3 d-flex align-items-center gap-3">
        <span class="text-body-secondary small">
          <i class="bi bi-person-circle me-1"></i>{{ auth.user.username }}
        </span>
        <router-link v-if="auth.user.role === 'admin' && !auth.user.must_change_pw" class="btn btn-sm btn-outline-secondary" to="/admin/users">
          <i class="bi bi-people me-1"></i>用户管理
        </router-link>
        <router-link class="btn btn-sm btn-outline-secondary" to="/change-password" title="修改密码">
          <i class="bi bi-key"></i>
        </router-link>
        <router-link v-if="!auth.user.must_change_pw" class="btn btn-sm btn-outline-secondary" to="/sessions" title="登录设备">
          <i class="bi bi-laptop"></i>
        </router-link>
        <button class="btn btn-sm btn-outline-secondary" @click="onLogout">退出</button>
      </div>
    </div>
  </nav>
  <main class="container py-4">
    <router-view />
  </main>
</template>

<style>
/* 延迟 200ms 才出现,快速切换时不会闪烁 */
.nav-progress {
  position: fixed; top: 0; left: 0; height: 3px; width: 0; z-index: 2000;
  background: #0d6efd; opacity: 0;
  animation: nav-grow 8s cubic-bezier(.1, .6, .2, 1) .2s forwards;
}
@keyframes nav-grow {
  from { width: 0; opacity: 1; }
  to { width: 90%; opacity: 1; }
}
</style>
