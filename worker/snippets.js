const DEFAULT_MAX = 200
const MAX_BYTES = 200 * 1024 // 单条片段上限
const TOOL_RE = /^[a-z0-9]{2,20}$/

// 用户可保存的条数上限:管理员/'*' 用默认值,0 表示禁用
export function snippetLimit(user) {
  if (user.role === 'admin' || user.permissions === '*') return DEFAULT_MAX
  const m = JSON.parse(user.permissions)?.snippets?.max
  return Number.isInteger(m) && m >= 0 ? m : 0
}

export async function handleSnippets({ request, url, db, user, json }) {
  const max = snippetLimit(user)
  if (max === 0) return json({ error: '没有片段库权限' }, 403)
  const m = request.method
  const { pathname } = url

  if (pathname === '/api/snippets' && m === 'GET') {
    const tool = url.searchParams.get('tool') || ''
    if (!TOOL_RE.test(tool)) return json({ error: '参数错误' }, 400)
    const { results } = await db
      .prepare('SELECT id, title, created_at, length(content) AS size FROM snippets WHERE user_id = ? AND tool = ? ORDER BY id DESC')
      .bind(user.id, tool)
      .all()
    const used = (await db.prepare('SELECT COUNT(*) AS n FROM snippets WHERE user_id = ?').bind(user.id).first()).n
    return json({ items: results, used, max })
  }

  if (pathname === '/api/snippets' && m === 'POST') {
    const b = await request.json().catch(() => null)
    const title = typeof b?.title === 'string' ? b.title.trim().slice(0, 80) : ''
    if (!TOOL_RE.test(b?.tool ?? '') || !title || typeof b.content !== 'string' || !b.content)
      return json({ error: '参数错误' }, 400)
    if (new TextEncoder().encode(b.content).length > MAX_BYTES) return json({ error: '内容超过 200 KB' }, 413)
    // 单条语句内判断条数上限,避免并发超限
    const res = await db
      .prepare(
        `INSERT INTO snippets (user_id, tool, title, content, created_at)
         SELECT ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM snippets WHERE user_id = ?) < ?`,
      )
      .bind(user.id, b.tool, title, b.content, Math.floor(Date.now() / 1000), user.id, max)
      .run()
    if (!res.meta.changes) return json({ error: `已达上限 ${max} 条,请先删除旧片段` }, 409)
    return json({ ok: true, id: res.meta.last_row_id })
  }

  const mm = pathname.match(/^\/api\/snippets\/(\d+)$/)
  if (mm) {
    const id = Number(mm[1])
    if (m === 'GET') {
      const row = await db
        .prepare('SELECT id, title, content FROM snippets WHERE id = ? AND user_id = ?')
        .bind(id, user.id)
        .first()
      return row ? json(row) : json({ error: '片段不存在' }, 404)
    }
    if (m === 'DELETE') {
      const res = await db.prepare('DELETE FROM snippets WHERE id = ? AND user_id = ?').bind(id, user.id).run()
      return res.meta.changes ? json({ ok: true }) : json({ error: '片段不存在' }, 404)
    }
  }
  return json({ error: '接口不存在' }, 404)
}
