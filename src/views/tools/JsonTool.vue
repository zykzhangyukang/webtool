<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { createJSONEditor, Mode } from 'vanilla-jsoneditor'
import { jsonrepair } from 'jsonrepair'
import { jsonToJava } from '../../tools/jsonToJava'

const host = ref(null)
const message = ref({ type: '', text: '' })
const javaOpen = ref(false)
const javaCode = ref('')
const javaStyle = ref('lombok')
const javaRoot = ref('Root')
const jackson = ref(true)
const indent = ref('2')
const STORAGE_KEY = 'webtool.json.content'
let editor
let saveTimer

const SAMPLE = '{"id":1,"user_name":"张三","tags":["java","vue"],"address":{"city":"Shanghai","zip":"200000"}}'

const spaces = () => (indent.value === 'tab' ? '\t' : Number(indent.value))
const notify = (type, text) => (message.value = { type, text })

// 文本模式返回 text,树形/表格模式返回 json,统一成文本
function getText() {
  const c = editor.get()
  return c.text !== undefined ? c.text : JSON.stringify(c.json)
}

const setText = (text) => editor.set({ text })

function parse() {
  try {
    return JSON.parse(getText())
  } catch (e) {
    notify('danger', `JSON 不合法:${e.message}`)
    return undefined
  }
}

function format() {
  const v = parse()
  if (v === undefined) return
  setText(JSON.stringify(v, null, spaces()))
  notify('success', '已格式化')
}

function minify() {
  const v = parse()
  if (v === undefined) return
  setText(JSON.stringify(v))
  notify('success', '已压缩')
}

function validate() {
  if (parse() !== undefined) notify('success', 'JSON 合法')
}

function sortKeys() {
  const v = parse()
  if (v === undefined) return
  const sort = (x) =>
    Array.isArray(x)
      ? x.map(sort)
      : x && typeof x === 'object'
        ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sort(x[k])]))
        : x
  setText(JSON.stringify(sort(v), null, spaces()))
  notify('success', '已按 key 排序')
}

// 转义:变成可放进字符串字面量的形式;反转义则相反
function escapeText() {
  setText(JSON.stringify(getText()).slice(1, -1))
  notify('success', '已转义')
}

function unescapeText() {
  const raw = getText().trim()
  try {
    const s = JSON.parse(raw.startsWith('"') ? raw : `"${raw}"`)
    try {
      setText(JSON.stringify(JSON.parse(s), null, spaces())) // 反转义结果是 JSON 就顺便格式化
    } catch {
      setText(s)
    }
    notify('success', '已反转义')
  } catch (e) {
    notify('danger', `无法反转义:${e.message}`)
  }
}

const switchMode = (mode) => editor.updateProps({ mode })

// 修复常见问题:单引号、缺引号、注释、尾逗号、截断等
function repair() {
  try {
    const fixed = jsonrepair(getText())
    setText(JSON.stringify(JSON.parse(fixed), null, spaces()))
    notify('success', '已自动修复并格式化')
  } catch (e) {
    notify('danger', `无法修复:${e.message}`)
  }
}

function download() {
  const url = URL.createObjectURL(new Blob([getText()], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'data.json' })
  a.click()
  URL.revokeObjectURL(url)
}

async function openFile(e) {
  const f = e.target.files[0]
  if (f) setText(await f.text())
  e.target.value = ''
}

// Ctrl/Cmd+Enter 格式化,Ctrl/Cmd+Shift+M 压缩
function onKey(e) {
  if (!(e.ctrlKey || e.metaKey)) return
  if (e.key === 'Enter') (e.preventDefault(), format())
  else if (e.shiftKey && e.key.toLowerCase() === 'm') (e.preventDefault(), minify())
}

async function copy() {
  await navigator.clipboard.writeText(getText())
  notify('success', '已复制到剪贴板')
}

function generateJava(v = parse()) {
  if (v === undefined) return
  javaCode.value = jsonToJava(v, {
    rootName: javaRoot.value.trim() || 'Root',
    style: javaStyle.value,
    jackson: jackson.value,
  })
}

function openJava() {
  const v = parse()
  if (v === undefined) return
  generateJava(v)
  javaOpen.value = true
}

async function copyJava() {
  await navigator.clipboard.writeText(javaCode.value)
  notify('success', 'Java 代码已复制')
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  const saved = localStorage.getItem(STORAGE_KEY)
  editor = createJSONEditor({
    target: host.value,
    props: {
      content: { text: saved ?? SAMPLE },
      mode: Mode.text,
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
  window.removeEventListener('keydown', onKey)
  clearTimeout(saveTimer)
  editor?.destroy()
})
</script>

<template>
  <h1 class="h4 mb-3">JSON 工具</h1>

  <div class="d-flex flex-wrap gap-2 mb-3 align-items-center">
    <button class="btn btn-primary" title="Ctrl+Enter" @click="format"><i class="bi bi-text-indent-left me-1"></i>格式化</button>
    <button class="btn btn-outline-primary" title="Ctrl+Shift+M" @click="minify">压缩</button>
    <button class="btn btn-outline-secondary" @click="validate">校验</button>
    <button class="btn btn-outline-secondary" @click="repair"><i class="bi bi-magic me-1"></i>修复</button>
    <button class="btn btn-outline-secondary" @click="sortKeys">Key 排序</button>
    <button class="btn btn-outline-secondary" @click="escapeText">转义</button>
    <button class="btn btn-outline-secondary" @click="unescapeText">反转义</button>
    <button class="btn btn-outline-success" @click="openJava"><i class="bi bi-cup-hot me-1"></i>转 Java 类</button>
    <button class="btn btn-outline-secondary" @click="copy"><i class="bi bi-clipboard me-1"></i>复制</button>
    <button class="btn btn-outline-secondary" @click="download"><i class="bi bi-download me-1"></i>下载</button>
    <label class="btn btn-outline-secondary mb-0">
      <i class="bi bi-folder2-open me-1"></i>打开
      <input type="file" accept=".json,.txt,application/json" hidden @change="openFile" />
    </label>
    <select v-model="indent" class="form-select w-auto" aria-label="缩进">
      <option value="2">缩进 2</option>
      <option value="4">缩进 4</option>
      <option value="tab">缩进 Tab</option>
    </select>
    <div class="btn-group ms-auto" role="group" aria-label="视图模式">
      <button class="btn btn-outline-secondary" @click="switchMode('text')">文本</button>
      <button class="btn btn-outline-secondary" @click="switchMode('tree')">树形</button>
      <button class="btn btn-outline-secondary" @click="switchMode('table')">表格</button>
    </div>
  </div>

  <div v-if="message.text" :class="['alert', 'py-2', `alert-${message.type}`]" role="status">{{ message.text }}</div>

  <div ref="host" class="json-host border rounded"></div>
  <p class="text-body-secondary small mt-2 mb-0">
    内容只在浏览器本地处理,缓存在本机 localStorage。快捷键:Ctrl+Enter 格式化,Ctrl+Shift+M 压缩。编辑器菜单里有 JSONPath / JMESPath 查询、过滤和排序。
  </p>

  <div v-if="javaOpen" class="modal d-block" tabindex="-1" role="dialog" aria-modal="true" style="background: rgba(0, 0, 0, 0.5)">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title h5">JSON 转 Java 类</h2>
          <button class="btn-close" aria-label="关闭" @click="javaOpen = false"></button>
        </div>
        <div class="modal-body">
          <div class="row g-2 mb-3 align-items-end">
            <div class="col-sm-4">
              <label class="form-label" for="root">类名</label>
              <input id="root" v-model="javaRoot" class="form-control" @input="generateJava()" />
            </div>
            <div class="col-sm-4">
              <label class="form-label" for="style">风格</label>
              <select id="style" v-model="javaStyle" class="form-select" @change="generateJava()">
                <option value="lombok">Lombok @Data</option>
                <option value="getset">Getter / Setter</option>
                <option value="record">Record</option>
              </select>
            </div>
            <div class="col-sm-4">
              <div class="form-check">
                <input id="jk" v-model="jackson" class="form-check-input" type="checkbox" @change="generateJava()" />
                <label class="form-check-label" for="jk">@JsonProperty</label>
              </div>
            </div>
          </div>
          <pre class="bg-body-tertiary border rounded p-3 mb-0"><code>{{ javaCode }}</code></pre>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="copyJava">复制代码</button>
          <button class="btn btn-secondary" @click="javaOpen = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-host {
  height: 60vh;
  min-height: 360px;
}
</style>
