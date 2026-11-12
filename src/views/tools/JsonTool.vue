<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { createJSONEditor, Mode } from 'vanilla-jsoneditor'

const host = ref(null)
const STORAGE_KEY = 'webtool.json.content'
let editor
let saveTimer

onMounted(() => {
  document.documentElement.style.overflow = 'hidden'
  const saved = localStorage.getItem(STORAGE_KEY)
  editor = createJSONEditor({
    target: host.value,
    props: {
      content: { text: saved ?? '' },
      mode: Mode.text,
      statusBar: false,
      onChange: (content) => {
        // 内容只缓存在本机浏览器,不上传
        clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
   const text = content.text !== undefined ? content.text : JSON.stringify(content.json)
   if (text.length < 2_000_000) localStorage.setItem(STORAGE_KEY, text)
        }, 500)
      },
    },
  })
})

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  clearTimeout(saveTimer)
  editor?.destroy()
})
</script>

<template>
  <div ref="host" class="json-host"></div>
</template>

<style scoped>
.json-host {
  height: 100vh;
}
/* 折叠箭头和行号不可选中,避免点击后出现蓝色选中块 */
.json-host :deep(.cm-gutters) {
  user-select: none;
  -webkit-user-select: none;
}
</style>
