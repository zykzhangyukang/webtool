import { ref } from 'vue'

// 通用复制:返回 copied(当前已复制的 key)和 copy(text, key)
export function useCopy() {
  const copied = ref('')
  async function copy(text, key = 'default') {
    await navigator.clipboard.writeText(text)
    copied.value = key
    setTimeout(() => (copied.value === key ? (copied.value = '') : 0), 1200)
  }
  return { copied, copy }
}
