import {
  hashPassword,
  newSalt,
  safeEqual,
  createSession,
  cookieOf,
  currentUser,
  destroySession,
  purgeExpired,
  tokenFrom,
  destroyUserSessions,
  audit,
  isLocked,
  recordFail,
  clearFails,
} from './auth.js'
import { handleAdmin } from './admin.js'
import { handleSnippets, snippetLimit } from './snippets.js'

// 返回给前端的用户信息
const pubSelf = (u) => ({
  username: u.username,
  role: u.role,
  must_change_pw: u.must_change_pw,
  permissions: u.permissions === '*' ? '*' : JSON.parse(u.permissions),
  snippetMax: snippetLimit(u),
})

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })

async function readCreds(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return null
  }
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  return { username, password }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const { pathname } = url
    const db = env.DB

    // 简单的 CSRF 防护:写操作要求同源
    if (request.method !== 'GET') {
      const origin = request.headers.get('Origin')
      if (origin && origin !== url.origin) return json({ error: '非法来源' }, 403)
    }

    if (pathname === '/api/status' && request.method === 'GET') {
      const row = await db.prepare('SELECT COUNT(*) AS n FROM users').first()
      const user = await currentUser(db, request)
      const { renewCookie, ...pub } = user || {}
      return json({ registerOpen: row.n === 0, user: user ? pubSelf(pub) : null }, 200, renewCookie ? { 'Set-Cookie': renewCookie } : {})
    }

    if (pathname === '/api/register' && request.method === 'POST') {
      const creds = await readCreds(request)
      if (!creds) return json({ error: '请求格式错误' }, 400)
      if (!/^[A-Za-z0-9_]{3,32}$/.test(creds.username))
        return json({ error: '用户名需为 3-32 位字母、数字或下划线' }, 400)
      if (creds.password.length < 8 || creds.password.length > 128)
        return json({ error: '密码长度需为 8-128 位' }, 400)

      const salt = newSalt()
      const hash = await hashPassword(creds.password, salt)
      // 单条语句内判断"表为空才插入",避免并发注册产生多个管理员
      const res = await db
        .prepare(
          `INSERT INTO users (username, password_hash, salt, role, created_at)
           SELECT ?, ?, ?, 'admin', ? WHERE NOT EXISTS (SELECT 1 FROM users)`,
        )
        .bind(creds.username, hash, salt, Math.floor(Date.now() / 1000))
        .run()
      if (!res.meta.changes) return json({ error: '注册已关闭,管理员已存在' }, 403)

      const token = await createSession(db, res.meta.last_row_id)
      return json({ user: { username: creds.username, role: 'admin', must_change_pw: 0, permissions: '*', snippetMax: 200 } }, 200, {
        'Set-Cookie': cookieOf(token),
      })
    }

    if (pathname === '/api/login' && request.method === 'POST') {
      const creds = await readCreds(request)
      if (!creds) return json({ error: '请求格式错误' }, 400)
      const ip = request.headers.get('CF-Connecting-IP') || 'local'
      const key = `${creds.username.toLowerCase()}|${ip}`
      if (await isLocked(db, key)) {
        await audit(db, { username: creds.username }, 'login.locked', creds.username, { ip })
        return json({ error: '失败次数过多,请 10 分钟后再试' }, 429)
      }
      const user = await db
        .prepare('SELECT id, username, role, password_hash, salt, status, expires_at, must_change_pw, permissions FROM users WHERE username = ?')
        .bind(creds.username)
        .first()
      // 用户不存在时也做一次哈希,让响应耗时接近
      const hash = await hashPassword(creds.password, user?.salt ?? newSalt())
      const now = Math.floor(Date.now() / 1000)
      const ok = user && safeEqual(hash, user.password_hash) && user.status === 'active' && !(user.expires_at && user.expires_at <= now)
      if (!ok) {
        await recordFail(db, key)
        await audit(db, { id: user?.id, username: creds.username }, 'login.fail', creds.username, { ip })
        return json({ error: '用户名或密码错误' }, 401)
      }
      await clearFails(db, key)
      await audit(db, user, 'login.ok', user.username, { ip })

      const token = await createSession(db, user.id)
      return json({ user: pubSelf(user) }, 200, {
        'Set-Cookie': cookieOf(token),
      })
    }

    if (pathname === '/api/logout' && request.method === 'POST') {
      await destroySession(db, request)
      return json({ ok: true }, 200, { 'Set-Cookie': cookieOf('', 0) })
    }

    // 其余 /api 接口都需要登录
    const user = await currentUser(db, request)
    if (!user) return json({ error: '未登录' }, 401)
    const renew = user.renewCookie ? { 'Set-Cookie': user.renewCookie } : {}

    // 修改密码:需旧密码,成功后清掉其他会话
    if (pathname === '/api/change-password' && request.method === 'POST') {
      let b
      try { b = await request.json() } catch { return json({ error: '请求格式错误' }, 400) }
      const row = await db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').bind(user.id).first()
      if (!safeEqual(await hashPassword(String(b?.oldPassword ?? ''), row.salt), row.password_hash))
        return json({ error: '旧密码错误' }, 400)
      const np = b?.newPassword
      if (typeof np !== 'string' || np.length < 8 || np.length > 128) return json({ error: '新密码长度需为 8-128 位' }, 400)
      if (np === b.oldPassword) return json({ error: '新密码不能与旧密码相同' }, 400)
      const salt = newSalt()
      await db
        .prepare('UPDATE users SET password_hash = ?, salt = ?, must_change_pw = 0 WHERE id = ?')
        .bind(await hashPassword(np, salt), salt, user.id)
        .run()
      await destroyUserSessions(db, user.id, tokenFrom(request))
      await audit(db, user, 'user.change_password', user.username)
      return json({ ok: true }, 200, renew)
    }

    // 必须先改密码
    if (user.must_change_pw) return json({ error: '请先修改密码', code: 'MUST_CHANGE_PW' }, 403)

    if (pathname.startsWith('/api/admin/')) {
      if (user.role !== 'admin') return json({ error: '无权限' }, 403)
      return handleAdmin({ request, url, db, user, json })
    }

    if (pathname === '/api/ping') return json({ ok: true, user: user.username }, 200, renew)

    if (pathname.startsWith('/api/snippets')) {
      const res = await handleSnippets({ request, url, db, user, json })
      if (user.renewCookie) res.headers.append('Set-Cookie', user.renewCookie)
      return res
    }

    return json({ error: '接口不存在' }, 404)
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(purgeExpired(env.DB))
  },
}

