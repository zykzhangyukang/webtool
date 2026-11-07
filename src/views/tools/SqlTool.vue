<script setup>
import SnippetBar from '../../components/SnippetBar.vue'
import { ref, computed } from 'vue'
import { format } from 'sql-formatter'
import { useCopy } from '../../tools/useCopy.js'

const input = ref("select u.id,u.name,count(o.id) as cnt from user u left join orders o on o.uid=u.id where u.status=1 and o.created_at>'2026-01-01' group by u.id,u.name having count(o.id)>3 order by cnt desc limit 10")
const dialect = ref('mysql')
const keywordCase = ref('upper')
const tab = ref(2)
const { copied, copy } = useCopy()

const dialects = ['mysql', 'postgresql', 'sql', 'mariadb', 'sqlite', 'plsql', 'transactsql', 'db2', 'redshift', 'bigquery']

const result = computed(() => {
  try {
    return { text: format(input.value, { language: dialect.value, keywordCase: keywordCase.value, tabWidth: tab.value }) }
  } catch (e) {
    return { error: e.message }
  }
})

// 输出为 Java 文本块,方便贴进代码
const javaBlock = computed(() => (result.value.text ? `String sql = """\n${result.value.text.replace(/^/gm, '    ')}\n    """;` : ''))
</script>

<template>
  <h1 class="h4 mb-3">SQL 格式化</h1>
  <SnippetBar tool="sql" :get-content="() => input.value" :set-content="(t) => (input.value = t)" />
  <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
    <select v-model="dialect" class="form-select w-auto" aria-label="方言">
      <option v-for="d in dialects" :key="d" :value="d">{{ d }}</option>
    </select>
    <select v-model="keywordCase" class="form-select w-auto" aria-label="关键字大小写">
      <option value="upper">关键字大写</option>
      <option value="lower">关键字小写</option>
      <option value="preserve">保持原样</option>
    </select>
    <select v-model.number="tab" class="form-select w-auto" aria-label="缩进">
      <option :value="2">缩进 2</option>
      <option :value="4">缩进 4</option>
    </select>
  </div>
  <div class="row g-3">
    <div class="col-lg-6">
      <label class="form-label" for="sin">输入</label>
      <textarea id="sin" v-model="input" class="form-control font-monospace" rows="16" spellcheck="false"></textarea>
    </div>
    <div class="col-lg-6">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="form-label mb-0">结果</span>
        <span>
          <button class="btn btn-sm btn-outline-secondary me-1" :disabled="!result.text" @click="copy(result.text, 'sql')">
            {{ copied === 'sql' ? '已复制' : '复制' }}
          </button>
          <button class="btn btn-sm btn-outline-secondary" :disabled="!result.text" @click="copy(javaBlock, 'java')">
            {{ copied === 'java' ? '已复制' : '复制为 Java 文本块' }}
          </button>
        </span>
      </div>
      <div v-if="result.error" class="alert alert-danger py-2 small">{{ result.error }}</div>
      <pre v-else class="form-control font-monospace" style="min-height: 22rem">{{ result.text }}</pre>
    </div>
  </div>
</template>
