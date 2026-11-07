import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import App from './App.vue'
import router from './router'
import { loadStatus } from './auth'

// 先拿到登录状态再挂载,路由守卫才能正确判断
loadStatus().finally(() => {
  createApp(App).use(router).mount('#app')
})
