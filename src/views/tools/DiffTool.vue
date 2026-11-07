<script setup>
import { ref, computed } from 'vue'
import { diffLines, diffWordsWithSpace } from 'diff'

const a = ref('{\n  "name": "webtool",\n  "version": "1.0"\n}')
const b = ref('{\n  "name": "webtool",\n  "version": "1.1",\n  "private": true\n}')
const ignoreWs = ref(false)

// 行级 diff;相邻的删除/新增块再做词级 diff,方便看行内改动
const rows = computed(() => {
  const chunks = diffLines(a.value, b.value, { ignoreWhitespace: ignoreWs.value })
  const out = []
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]
    const next = chunks[i + 1]
    if (c.removed && next?.added) {
      const w = diffWordsWithSpace(c.value, next.value)
      out.push({ type: 'del', segs: w.filter((x) => !x.added).map((x) => ({ t: x.value, hl: x.removed })) })
      out.push({ type: 'add', segs: w.filter((x) => !x.removed).map((x) => ({ t: x.value, hl: x.added })) })
      i++
    } else {
      out.push({ type: c.added ? 'add' : c.removed ? 'del' : 'eq', segs: [{ t: c.value, hl: false }] })
    }
  }
  return out
})
const stat = computed(() => ({
  add: rows.value.filter((r) => r.type === 'add').reduce((n, r) => n + r.segs.map((s) => s.t).join('').split('\n').filter(Boolean).length, 0),
  del: rows.value.filter((r) => r.type === 'del').reduce((n, r) => n + r.segs.map((s) => s.t).join('').split('\n').filter(Boolean).length, 0),
}))
</script>

<template>
  <h1 class="h4 mb-3">文本对比</h1>
  <div class="row g-3 mb-3">
    <div class="col-md-6">
      <label class="form-label" for="da">原文</label>
      <textarea id="da" v-model="a" class="form-control font-monospace" rows="10" spellcheck="false"></textarea>
    </div>
    <div class="col-md-6">
      <label class="form-label" for="db">新文本</label>
      <textarea id="db" v-model="b" class="form-control font-monospace" rows="10" spellcheck="false"></textarea>
    </div>
  </div>
  <div class="d-flex align-items-center gap-3 mb-2">
    <div class="form-check mb-0">
      <input id="dws" v-model="ignoreWs" type="checkbox" class="form-check-input" />
      <label for="dws" class="form-check-label">忽略空白差异</label>
    </div>
    <span class="text-success font-monospace">+{{ stat.add }}</span>
    <span class="text-danger font-monospace">-{{ stat.del }}</span>
  </div>
  <div class="border rounded font-monospace small diff">
    <pre v-for="(r, i) in rows" :key="i" class="mb-0 px-2" :class="'d-' + r.type"><template v-for="(s, j) in r.segs" :key="j"><span :class="{ hl: s.hl }">{{ s.t }}</span></template></pre>
  </div>
</template>

<style scoped>
.diff pre { white-space: pre-wrap; word-break: break-all; }
.d-add { background: rgba(25, 135, 84, 0.15); }
.d-del { background: rgba(220, 53, 69, 0.15); }
.d-add .hl { background: rgba(25, 135, 84, 0.45); }
.d-del .hl { background: rgba(220, 53, 69, 0.45); }
</style>
