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

export async function createSession(db, userId) {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)))
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL
  // 库里只存 token 的哈希,即使数据库泄露也无法直接冒用会话
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(token), userId, expires)
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
      `SELECT u.id, u.username, u.role, s.expires_at FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(await sha256(token), now)
    .first()
    .then(async (row) => {
      if (!row) return null
      const { expires_at, ...user } = row
      // 滑动续期:剩余不足一半有效期时顺延,并带回新的 Cookie 过期时间
      if (expires_at - now < SESSION_TTL / 2) {
        await db
          .prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
          .bind(now + SESSION_TTL, await sha256(token))
          .run()
        user.renewCookie = cookieOf(token)
      }
      return user
    })
}

// 定时清理过期会话
export const purgeExpired = (db) =>
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Math.floor(Date.now() / 1000)).run()

export async function destroySession(db, request) {
  const token = tokenFrom(request)
  if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run()
}
