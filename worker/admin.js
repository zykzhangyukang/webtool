import { hashPassword, newSalt, destroyUserSessions, killSession, audit } from './auth.js'

const TOOL_IDS = ['json', 'sql', 'yaml', 'timestamp', 'cron', 'base64', 'uuid', 'jwt', 'hash', 'url', 'regex', 'diff']

// 校验并规范化权限:'*' 或 {"tools":[...]}
function normPerms(p) {
  if (p === '*') return '*'
  if (!p || !Array.isArray(p.tools)) return null
  const tools = [...new Set(p.tools)].filter((t) => TOOL_IDS.includes(t))
  return JSON.stringify({ tools })
}

const validName = (s) => typeof s === 'string' && /^[A-Za-z0-9_]{3,32}$/.test(s)
const validPw = (s) => typeof s === 'string' && s.length >= 8 && s.length <= 128
const parseExp = (v) => (v == null || v === '' ? null : Number.isInteger(v) && v > 0 ? v : undefined)

const pubUser = (u) => ({
  id: u.id,
  username: u.username,
  role: u.role,
  status: u.status,
  expires_at: u.expires_at,
  must_change_pw: u.must_change_pw,
  permissions: u.permissions === '*' ? '*' : JSON.parse(u.permissions),
  created_at: u.created_at,
})

// 其他仍启用的管理员数量(排除指定 id)
const otherAdmins = (db, id) =>
  db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND status='active' AND id != ?")
    .bind(id)
    .first()
    .then((r) => r.n)

export async function handleAdmin({ request, url, db, user, json }) {
  const { pathname } = url
  const m = request.method
  const body = async () => request.json().catch(() => null)

  if (pathname === '/api/admin/users' && m === 'GET') {
    const { results } = await db.prepare('SELECT * FROM users ORDER BY id').all()
    return json({ users: results.map(pubUser) })
  }

  if (pathname === '/api/admin/users' && m === 'POST') {
    const b = await body()
    if (!b) return json({ error: '请求格式错误' }, 400)
    if (!validName(b.username)) return json({ error: '用户名需为 3-32 位字母、数字或下划线' }, 400)
    if (!validPw(b.password)) return json({ error: '密码长度需为 8-128 位' }, 400)
    const role = b.role === 'admin' ? 'admin' : 'user'
    const perms = role === 'admin' ? '*' : normPerms(b.permissions)
    const exp = parseExp(b.expires_at)
    if (!perms) return json({ error: '权限格式错误' }, 400)
    if (exp === undefined) return json({ error: '到期时间格式错误' }, 400)
    const salt = newSalt()
    const hash = await hashPassword(b.password, salt)
    try {
      await db
        .prepare(
          `INSERT INTO users (username, password_hash, salt, role, created_at, status, expires_at, must_change_pw, permissions)
           VALUES (?, ?, ?, ?, ?, 'active', ?, 1, ?)`,
        )
        .bind(b.username, hash, salt, role, Math.floor(Date.now() / 1000), exp, perms)
        .run()
    } catch {
      return json({ error: '用户名已存在' }, 409)
    }
    await audit(db, user, 'user.create', b.username, { role, permissions: perms, expires_at: exp })
    return json({ ok: true })
  }

  if (pathname === '/api/admin/audit' && m === 'GET') {
    const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1)
    const size = 50
    const { results } = await db
      .prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?')
      .bind(size, (page - 1) * size)
      .all()
    const total = (await db.prepare('SELECT COUNT(*) AS n FROM audit_log').first()).n
    return json({ items: results, total, page, size })
  }

  if (pathname === '/api/admin/sessions' && m === 'GET') {
    const { results } = await db
      .prepare(
        `SELECT substr(s.token_hash,1,16) AS sid, s.ua, s.ip, s.created_at, s.last_seen, s.expires_at, u.username
  FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.expires_at > ? ORDER BY s.last_seen DESC`,
      )
      .bind(Math.floor(Date.now() / 1000))
      .all()
    return json({ sessions: results.map((s) => ({ ...s, current: s.sid === user.sid })) })
  }

  const am = pathname.match(/^\/api\/admin\/sessions\/([0-9a-f]{16})$/)
  if (am && m === 'DELETE') {
    if (am[1] === user.sid) return json({ error: '不能踢出当前设备' }, 400)
    const row = await db
      .prepare("SELECT u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash LIKE ? || '%'")
      .bind(am[1])
      .first()
    if (!row || !(await killSession(db, am[1]))) return json({ error: '会话不存在' }, 404)
    await audit(db, user, 'session.admin_kick', row.username, { sid: am[1] })
    return json({ ok: true })
  }

  const mm = pathname.match(/^\/api\/admin\/users\/(\d+)(\/reset-password)?$/)
  if (!mm) return json({ error: '接口不存在' }, 404)
  const id = Number(mm[1])
  const target = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
  if (!target) return json({ error: '用户不存在' }, 404)
  const isSelf = id === user.id

  if (mm[2] && m === 'POST') {
    const b = await body()
    if (!validPw(b?.password)) return json({ error: '密码长度需为 8-128 位' }, 400)
    const salt = newSalt()
    await db
      .prepare('UPDATE users SET password_hash = ?, salt = ?, must_change_pw = 1 WHERE id = ?')
      .bind(await hashPassword(b.password, salt), salt, id)
      .run()
    await destroyUserSessions(db, id)
    await audit(db, user, 'user.reset_password', target.username)
    return json({ ok: true })
  }

  if (m === 'PATCH') {
    const b = await body()
    if (!b) return json({ error: '请求格式错误' }, 400)
    const role = b.role === undefined ? target.role : b.role === 'admin' ? 'admin' : 'user'
    const status = b.status === undefined ? target.status : b.status === 'disabled' ? 'disabled' : 'active'
    let perms = target.permissions
    if (b.permissions !== undefined) {
      perms = normPerms(b.permissions)
      if (!perms) return json({ error: '权限格式错误' }, 400)
    }
    if (role === 'admin') perms = '*'
    let exp = target.expires_at
    if (b.expires_at !== undefined) {
      exp = parseExp(b.expires_at)
      if (exp === undefined) return json({ error: '到期时间格式错误' }, 400)
    }
    if (isSelf && (status !== 'active' || role !== 'admin'))
      return json({ error: '不能停用或降级自己' }, 400)
    const losingAdmin = target.role === 'admin' && target.status === 'active' && (role !== 'admin' || status !== 'active')
    if (losingAdmin && (await otherAdmins(db, id)) === 0)
      return json({ error: '至少需要保留一个启用的管理员' }, 400)

    await db
      .prepare('UPDATE users SET role = ?, status = ?, permissions = ?, expires_at = ? WHERE id = ?')
      .bind(role, status, perms, exp, id)
      .run()
    if (status !== 'active' || role !== target.role) await destroyUserSessions(db, id)
    const changes = {}
    if (role !== target.role) changes.role = role
    if (status !== target.status) changes.status = status
    if (perms !== target.permissions) changes.permissions = perms
    if (exp !== target.expires_at) changes.expires_at = exp
    const action = changes.status ? (status === 'disabled' ? 'user.disable' : 'user.enable') : 'user.update'
    await audit(db, user, action, target.username, changes)
    return json({ ok: true })
  }

  if (m === 'DELETE') {
    if (isSelf) return json({ error: '不能删除自己' }, 400)
    if (target.role === 'admin' && target.status === 'active' && (await otherAdmins(db, id)) === 0)
      return json({ error: '至少需要保留一个启用的管理员' }, 400)
    await destroyUserSessions(db, id)
    await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
    await audit(db, user, 'user.delete', target.username)
    return json({ ok: true })
  }

  return json({ error: '接口不存在' }, 404)
}
