-- 会话设备信息:UA、IP、创建与最后活跃时间(ALTER 不幂等,只能执行一次)
ALTER TABLE sessions ADD COLUMN ua TEXT;
ALTER TABLE sessions ADD COLUMN ip TEXT;
ALTER TABLE sessions ADD COLUMN created_at INTEGER;
ALTER TABLE sessions ADD COLUMN last_seen INTEGER;
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
