<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import monaco from '../../tools/monaco'

const host = ref(null)
const pos = ref('Ln 1, Col 1')
const stat = ref('')
const wrap = ref(true)
const STORAGE_KEY = 'webtool.editor.content'
let editor
let saveTimer

// 整个文档的内容变换:用 executeEdits,保留撤销历史
function transform(fn) {
  const model = editor.getModel()
  editor.executeEdits('tool', [{ range: model.getFullModelRange(), text: fn(model.getValue()) }])
  editor.pushUndoStop()
}

const lines = (t) => t.split(/\r?\n/)
const nonEmpty = (t) => lines(t).map((s) => s.trim()).filter(Boolean)
const QUOTED = /'((?:[^']|'')*)'|"((?:[^"\\]|\\.)*)"/g

// 通过 F1 命令面板调用的文本处理命令
const commands = [
  ['text.toSql', '转为 SQL 列表: A B C -> (\'A\',\'B\',\'C\')', (t) => `(${nonEmpty(t).map((s) => `'${s.replaceAll("'", "''")}'`).join(',')})`],
  ['text.fromSql', '还原为行: 取出引号里的值,每行一个', (t) => {
    const hit = [...t.matchAll(QUOTED)]
    if (hit.length) return hit.map((m) => (m[1] !== undefined ? m[1].replaceAll("''", "'") : m[2])).join('\n')
    return t.split(/[\s,;，；]+/).map((s) => s.replace(/^\(+|\)+$/g, '')).filter(Boolean).join('\n')
  }],
  ['text.dedupe', '去重行', (t) => [...new Set(lines(t))].join('\n')],
  ['text.removeEmpty', '删除空行', (t) => lines(t).filter((s) => s.trim()).join('\n')],
  ['text.trimLines', '去除每行首尾空格', (t) => lines(t).map((s) => s.trim()).join('\n')],
  ['text.joinAll', '去掉所有换行(合成一行)', (t) => lines(t).map((s) => s.trim()).filter(Boolean).join('')],
  ['text.splitComma', '按逗号/分号拆成多行', (t) => t.split(/[,，;；]+/).map((s) => s.trim()).filter(Boolean).join('\n')],
]

// 快捷键(F1 可能被截图软件占用)
const K = monaco.KeyCode
const keys = {
  'text.toSql': monaco.KeyMod.Alt | K.KeyQ,
  'text.fromSql': monaco.KeyMod.Alt | monaco.KeyMod.Shift | K.KeyQ,
  'text.dedupe': monaco.KeyMod.Alt | K.KeyD,
}

function runCmd(id) {
  const c = commands.find((x) => x[0] === id)
  transform(c[2])
  editor.focus()
}

function runAction(id) {
  editor.focus()
  editor.getAction(id)?.run()
}

function openPalette() {
  editor.focus()
  editor.trigger('ui', 'editor.action.quickCommand', null)
}

function toggleWrap() {
  wrap.value = !wrap.value
  editor.updateOptions({ wordWrap: wrap.value ? 'on' : 'off' })
}

function updateInfo() {
  const m = editor.getModel()
  const sel = editor.getSelection()
  pos.value = `Ln ${sel.positionLineNumber}, Col ${sel.positionColumn}`
  const picked = !sel.isEmpty() ? `(已选 ${m.getValueInRange(sel).length.toLocaleString()})  ` : ''
  stat.value = `${picked}${m.getLineCount().toLocaleString()} 行  ${m.getValueLength().toLocaleString()} 字符`
}

onMounted(() => {
  document.documentElement.style.overflow = 'hidden'
  editor = monaco.editor.create(host.value, {
    value: localStorage.getItem(STORAGE_KEY) ?? '',
    language: 'plaintext',
    // 查找框浮在内容上方,不把文本顶下去
    find: { addExtraSpaceOnTop: false },
    theme: 'vs',
    automaticLayout: true,
    wordWrap: 'on',
    minimap: { enabled: true },
    renderWhitespace: 'selection',
    scrollBeyondLastLine: false,
    fontSize: 14,
    fontFamily: "Consolas, 'Courier New', monospace",
    smoothScrolling: true,
    cursorSmoothCaretAnimation: 'on',
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    wordBasedSuggestions: 'off',
  })
  for (const [id, label, fn] of commands) {
    editor.addAction({ id, label: `文本: ${label}`, keybindings: keys[id] ? [keys[id]] : [], run: () => transform(fn) })
  }
  // F1 可能被截图软件占用,F2 也能打开命令面板
  editor.addCommand(monaco.KeyCode.F2, openPalette)
  editor.addAction({
    id: 'view.toggleWrap',
    label: '视图: 切换自动换行',
    keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyZ],
    run: toggleWrap,
  })
  editor.onDidChangeModelContent(() => {
    updateInfo()
    // 内容只缓存在本机浏览器,不上传
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const v = editor.getValue()
      if (v.length < 5_000_000) localStorage.setItem(STORAGE_KEY, v)
    }, 600)
  })
  editor.onDidChangeCursorSelection(updateInfo)
  updateInfo()
  editor.focus()
})

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  clearTimeout(saveTimer)
  editor?.dispose()
})
</script>

<template>
  <div class="editor-page">
    <div class="bar d-flex flex-wrap align-items-center gap-1 px-2 py-1 border-bottom bg-body-tertiary">
      <router-link to="/" class="btn btn-sm btn-outline-secondary" title="返回主页"><i class="bi bi-house"></i></router-link>
      <span class="ms-auto small text-body-secondary">{{ stat }} · {{ pos }}</span>
    </div>
    <div ref="host" class="editor-host"></div>
  </div>
</template>

<style scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.editor-host {
  flex: 1;
  min-height: 0;
}
</style>


