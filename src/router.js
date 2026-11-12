import { createRouter, createWebHistory } from 'vue-router'
import { auth, nav } from './auth'
import { tools, allowedTools } from './tools/registry'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/Home.vue'), meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: () => import('./views/Login.vue') },
    { path: '/change-password', name: 'change-password', component: () => import('./views/ChangePassword.vue'), meta: { requiresAuth: true } },
    { path: '/sessions', name: 'sessions', component: () => import('./views/Sessions.vue'), meta: { requiresAuth: true } },
    { path: '/admin/users', name: 'admin-users', component: () => import('./views/admin/Users.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
    ...tools.map((t) => ({
      path: `/tools/${t.id}`,
      name: `tool-${t.id}`,
      component: t.component,
      meta: { requiresAuth: true, title: t.name, toolId: t.id },
    })),
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  nav.loading = true
  if (to.meta.requiresAuth && !auth.user) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login' && auth.user) return { name: 'home' }
  // 临时密码:必须先改密码
  if (auth.user?.must_change_pw && to.name !== 'change-password') return { name: 'change-password' }
  if (to.meta.requiresAdmin && auth.user?.role !== 'admin') return { name: 'home' }
  if (to.meta.toolId && !allowedTools(auth.user).some((t) => t.id === to.meta.toolId)) return { name: 'home' }
})
router.afterEach(() => {
  nav.loading = false
})
router.onError(() => {
  nav.loading = false
})

export default router
