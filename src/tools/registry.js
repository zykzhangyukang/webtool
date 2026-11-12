// 新增工具只需:1) 在 views/tools 下写一个组件 2) 在这里登记一项
export const tools = [
  {
    id: 'json',
    name: 'JSON 格式化',
    desc: '格式化、压缩、校验 JSON',
    icon: 'bi-braces',
    category: '数据格式',
    component: () => import('../views/tools/JsonTool.vue'),
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    desc: '秒/毫秒时间戳与日期互转',
    icon: 'bi-clock-history',
    category: '时间日期',
    component: () => import('../views/tools/TimestampTool.vue'),
  },
  {
    id: 'editor',
    name: '文本编辑器',
    desc: '类 Notepad++:查找替换、排序去重、多光标,支持几十万行',
    icon: 'bi-file-earmark-text',
    category: '文本处理',
    component: () => import('../views/tools/TextEditorTool.vue'),
  },
]
// 当前用户可用的工具('*' 表示全部)
export function allowedTools(user) {
  if (!user) return []
  const p = user.permissions
  if (user.role === 'admin' || p === '*') return tools
  return tools.filter((t) => p?.tools?.includes(t.id))
}

