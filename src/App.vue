<script setup>
import { useRouter } from 'vue-router'
import { auth, nav, logout } from './auth'

const router = useRouter()

async function onLogout() {
  await logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div v-if="nav.loading" class="nav-progress"></div>
  <nav class="navbar navbar-expand bg-body-tertiary border-bottom">
    <div class="container">
      <router-link class="navbar-brand fw-semibold" to="/">
        <i class="bi bi-tools me-2"></i>WebTool
      </router-link>
      <div v-if="auth.user" class="ms-auto d-flex align-items-center gap-3">
        <span class="text-body-secondary small">
          <i class="bi bi-person-circle me-1"></i>{{ auth.user.username }}
        </span>
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
