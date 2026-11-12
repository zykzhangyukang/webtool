const enc = new TextEncoder()
const SESSION_TTL = 7 * 24 * 3600 // 秒
const ITERATIONS = 100000 // Workers WebCrypto 的 PBKDF2 上限

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const salt = Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16)))
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    key,
    256,
  )
  return toHex(bits)
}

export const newSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)))

async function sha256(text) {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)))
}

// 常量时间比较,避免时序攻击
export function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function createSession(db, userId, request) {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)))
  const now = Math.floor(Date.now() / 1000)
  const ua = (request?.headers.get('User-Agent') || '').slice(0, 255)
  const ip = request?.headers.get('CF-Connecting-IP') || null
  // 库里只存 token 的哈希,即使数据库泄露也无法直接冒用会话
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at, ua, ip, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(await sha256(token), userId, now + SESSION_TTL, ua, ip, now, now)
    .run()
  return token
}

export const cookieOf = (token, maxAge = SESSION_TTL) =>
  `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`

export function tokenFrom(request) {
  const m = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)session=([0-9a-f]{64})/)
  return m ? m[1] : null
}

export async function currentUser(db, request) {
  const token = tokenFrom(request)
  if (!token) return null
  const now = Math.floor(Date.now() / 1000)
  return db
    .prepare(
      `SELECT u.id, u.username, u.role, u.permissions, u.must_change_pw, u.status,
              u.expires_at AS acct_expires, s.expires_at, s.token_hash, s.last_seen FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(await sha256(token), now)
    .first()
    .then(async (row) => {
      if (!row) return null
      const { expires_at, acct_expires, status, token_hash, last_seen, ...user } = row
      // 停用或账号到期:视为未登录
      if (status !== 'active' || (acct_expires && acct_expires <= now)) return null
      user.expires_at = acct_expires
      user.sid = token_hash.slice(0, 16)
      // 滑动续期:剩余不足一半有效期时顺延,并带回新的 Cookie 过期时间
      const renew = expires_at - now < SESSION_TTL / 2
      // 最后活跃时间节流:超过 5 分钟才写库
      if (renew || now - (last_seen || 0) > 300) {
        await db
   .prepare('UPDATE sessions SET expires_at = ?, last_seen = ? WHERE token_hash = ?')
          .bind(renew ? now + SESSION_TTL : expires_at, now, token_hash)
          .run()
      }
      if (renew) user.renewCookie = cookieOf(token)
      return user
    })
}

// 定时清理过期会话
export const purgeExpired = async (db) => {
  const now = Math.floor(Date.now() / 1000)
  await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now).run()
  await db.prepare('DELETE FROM login_attempts WHERE ? - window_start >= 600').bind(now).run()
  // 审计日志保留 180 天
  await db.prepare('DELETE FROM audit_log WHERE ts < ?').bind(now - 180 * 86400).run()
}

export async function destroySession(db, request) {
  const token = tokenFrom(request)
  if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run()
}

// 清掉某用户的全部会话(可保留当前会话)
export async function destroyUserSessions(db, userId, keepToken = null) {
  if (!keepToken) return db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run()
  return db
    .prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?')
    .bind(userId, await sha256(keepToken))
    .run()
}

// 审计日志
export const audit = (db, actor, action, target = null, detail = null) =>
  db
    .prepare('INSERT INTO audit_log (ts, actor_id, actor, action, target, detail) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(
      Math.floor(Date.now() / 1000),
      actor?.id ?? null,
      actor?.username ?? null,
      action,
      target,
      detail ? JSON.stringify(detail) : null,
    )
    .run()

// 登录限流:同一 用户名+IP 在窗口内失败 MAX_FAILS 次后锁定
const MAX_FAILS = 5
const LOCK_WINDOW = 600
export async function isLocked(db, key) {
  const now = Math.floor(Date.now() / 1000)
  const r = await db.prepare('SELECT fails, window_start FROM login_attempts WHERE key = ?').bind(key).first()
  return !!r && r.fails >= MAX_FAILS && now - r.window_start < LOCK_WINDOW
}
export async function recordFail(db, key) {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      `INSERT INTO login_attempts (key, fails, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         fails = CASE WHEN ? - window_start >= ? THEN 1 ELSE fails + 1 END,
         window_start = CASE WHEN ? - window_start >= ? THEN ? ELSE window_start END`,
    )
    .bind(key, now, now, LOCK_WINDOW, now, LOCK_WINDOW, now)
    .run()
}
export const clearFails = (db, key) => db.prepare('DELETE FROM login_attempts WHERE key = ?').bind(key).run()

// 按 sid(token_hash 前 16 位)删除会话;userId 为 null 时不限用户。返回删除行数
export async function killSession(db, sid, userId = null) {
  if (!/^[0-9a-f]{16}$/.test(sid)) return 0
  const r = userId
    ? await db.prepare("DELETE FROM sessions WHERE token_hash LIKE ? || '%' AND user_id = ?").bind(sid, userId).run()
    : await db.prepare("DELETE FROM sessions WHERE token_hash LIKE ? || '%'").bind(sid).run()
  return r.meta.changes
}
