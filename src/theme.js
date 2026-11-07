import { reactive, watchEffect } from 'vue'

// mode: auto(跟随系统) | light | dark
const KEY = 'webtool.theme'
export const theme = reactive({ mode: localStorage.getItem(KEY) || 'auto' })

const media = window.matchMedia('(prefers-color-scheme: dark)')
export const isDark = () => theme.mode === 'dark' || (theme.mode === 'auto' && media.matches)

function apply() {
  const dark = isDark()
  document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light')
  // vanilla-jsoneditor 的暗色主题靠这个 class
  document.documentElement.classList.toggle('jse-theme-dark', dark)
}

export function initTheme() {
  watchEffect(() => {
    localStorage.setItem(KEY, theme.mode)
    apply()
  })
  media.addEventListener('change', apply)
}

export const cycleTheme = () => {
  theme.mode = { auto: 'light', light: 'dark', dark: 'auto' }[theme.mode]
}
