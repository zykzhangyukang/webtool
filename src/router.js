import { createRouter, createWebHistory } from 'vue-router'
import { auth } from './auth'
import { tools } from './tools/registry'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/Home.vue'), meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: () => import('./views/Login.vue') },
    ...tools.map((t) => ({
      path: `/tools/${t.id}`,
      name: `tool-${t.id}`,
      component: t.component,
      meta: { requiresAuth: true, title: t.name },
    })),
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !auth.user) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login' && auth.user) return { name: 'home' }
})

export default router
