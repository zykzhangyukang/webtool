<script setup>
import { useRouter } from 'vue-router'
import { auth, logout } from './auth'

const router = useRouter()

async function onLogout() {
  await logout()
  router.push({ name: 'login' })
}
</script>

<template>
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
