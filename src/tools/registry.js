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
    id: 'base64',
    name: 'Base64 编解码',
    desc: 'Base64 与文本互转(支持 UTF-8)',
    icon: 'bi-file-earmark-lock',
    category: '编码加密',
    component: () => import('../views/tools/Base64Tool.vue'),
  },
]
