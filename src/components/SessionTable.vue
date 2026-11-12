<script setup>
import { UAParser } from 'ua-parser-js'

// 会话列表:admin 模式多一列用户名
defineProps({ sessions: Array, admin: Boolean })
defineEmits(['kick'])

const fmt = (ts) => (ts ? new Date(ts * 1000).toLocaleString() : '未知')
function device(ua) {
  if (!ua) return '未知设备'
  const r = new UAParser(ua).getResult()
  const browser = r.browser.name ? `${r.browser.name} ${r.browser.major || ''}`.trim() : '未知浏览器'
  return `${browser} / ${r.os.name || '未知系统'}`
}
</script>

<template>
  <div class="table-responsive">
    <table class="table align-middle">
      <thead>
        <tr>
          <th v-if="admin">用户</th>
          <th>设备</th>
          <th>IP</th>
          <th>登录时间</th>
          <th>最后活跃</th>
          <th class="text-end">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in sessions" :key="s.sid">
          <td v-if="admin">{{ s.username }}</td>
          <td>
            {{ device(s.ua) }}
            <span v-if="s.current" class="badge text-bg-success ms-2">当前</span>
          </td>
          <td class="text-nowrap">{{ s.ip || '-' }}</td>
          <td class="text-nowrap">{{ fmt(s.created_at) }}</td>
          <td class="text-nowrap">{{ fmt(s.last_seen) }}</td>
          <td class="text-end">
            <button v-if="!s.current" class="btn btn-sm btn-outline-danger" @click="$emit('kick', s)">踢出</button>
          </td>
        </tr>
        <tr v-if="!sessions.length">
          <td :colspan="admin ? 6 : 5" class="text-center text-body-secondary">暂无会话</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
