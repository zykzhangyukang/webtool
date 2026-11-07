<script setup>
import SnippetBar from '../../components/SnippetBar.vue'
import { ref, computed } from 'vue'
import { useCopy } from '../../tools/useCopy.js'

const input = ref('https://example.com/search?q=java 开发&lang=zh-CN&tags=a&tags=b#top')
const output = ref('')
const error = ref('')
const full = ref(true)
const { copied, copy } = useCopy()

function encode() {
  error.value = ''
  output.value = full.value ? encodeURIComponent(input.value) : encodeURI(input.value)
}
function decode() {
  try {
    error.value = ''
    output.value = decodeURIComponent(input.value.replace(/\+/g, ' '))
  } catch (e) {
    error.value = '不是合法的 URL 编码'
  }
}

// 解析 URL 各部分与查询参数
const parsed = computed(() => {
  try {
    const u = new URL(input.value.trim())
    return {
      parts: [
        ['协议', u.protocol], ['主机', u.hostname], ['端口', u.port], ['路径', u.pathname], ['锚点', u.hash],
      ].filter(([, v]) => v),
      params: [...u.searchParams.entries()],
    }
  } catch {
    return null
  }
})
</script>

<template>
  <h1 class="h4 mb-3">URL 编解码 / 解析</h1>
  <SnippetBar tool="url" :get-content="() => input.value" :set-content="(t) => (input.value = t)" />
  <label class="form-label" for="uin">输入</label>
  <textarea id="uin" v-model="input" class="form-control font-monospace mb-2" rows="3" spellcheck="false"></textarea>
  <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
    <button class="btn btn-primary" @click="encode">编码</button>
    <button class="btn btn-outline-primary" @click="decode">解码</button>
    <div class="form-check ms-2 mb-0">
      <input id="ufull" v-model="full" type="checkbox" class="form-check-input" />
      <label for="ufull" class="form-check-label">编码全部字符(encodeURIComponent,对应 Java URLEncoder)</label>
    </div>
  </div>
  <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
  <div v-if="output" class="input-group mb-4">
    <textarea :value="output" class="form-control font-monospace" rows="3" readonly aria-label="结果"></textarea>
    <button class="btn btn-outline-secondary" @click="copy(output, 'out')">
      <i class="bi" :class="copied === 'out' ? 'bi-check2' : 'bi-clipboard'"></i>
    </button>
  </div>
  <template v-if="parsed">
    <h2 class="h6">URL 结构</h2>
    <table class="table table-sm font-monospace">
      <tbody>
        <tr v-for="[k, v] in parsed.parts" :key="k"><th style="width: 6rem">{{ k }}</th><td>{{ v }}</td></tr>
      </tbody>
    </table>
    <template v-if="parsed.params.length">
      <h2 class="h6">查询参数</h2>
      <table class="table table-sm font-monospace">
        <tbody>
          <tr v-for="([k, v], i) in parsed.params" :key="i"><th style="width: 10rem">{{ k }}</th><td>{{ v }}</td></tr>
        </tbody>
      </table>
    </template>
  </template>
</template>
