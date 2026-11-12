import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Monaco 是深层路径导入,依赖预构建会反复失效(504 Outdated Optimize Dep),开发时直接按原生 ESM 加载
  optimizeDeps: { exclude: ['monaco-editor'] },
  server: {
    // 本地开发时把 /api 代理到 wrangler dev
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true, // Host 头改为后端地址,与下面改写的 Origin 保持一致
        configure: (proxy) => {
          // Worker 会校验 Origin 是否同源,开发代理时改写成后端地址
          proxy.on('proxyReq', (proxyReq) => {
            if (proxyReq.getHeader('origin')) proxyReq.setHeader('origin', 'http://localhost:8787')
          })
        },
      },
    },
  },
})

