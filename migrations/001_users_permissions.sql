-- 一次性迁移:用户状态/到期/权限、审计日志、登录限流(ALTER 不幂等,只能执行一次)
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN expires_at INTEGER;
ALTER TABLE users ADD COLUMN must_change_pw INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT '*';

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  actor_id INTEGER,
  actor TEXT,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);

CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  fails INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
