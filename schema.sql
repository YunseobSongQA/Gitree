-- 안 웃기 챌린지 · D1 스키마
-- 적용:  npx wrangler d1 execute dontlaugh --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS jokes (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  setup   TEXT    NOT NULL,
  punch   TEXT    NOT NULL,
  emoji   TEXT    NOT NULL DEFAULT '',
  lang    TEXT    NOT NULL DEFAULT 'ko',
  nick    TEXT    NOT NULL DEFAULT '',
  author  TEXT    NOT NULL,              -- 기기마다 생기는 익명 ID
  laughs  INTEGER NOT NULL DEFAULT 0,
  hidden  INTEGER NOT NULL DEFAULT 0,    -- 1 로 바꾸면 피드에서 빠진다
  created INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  target  TEXT    NOT NULL,              -- 'u<드립id>' 또는 'b_<lang>_<번호>'(기본 개그)
  body    TEXT    NOT NULL,
  nick    TEXT    NOT NULL DEFAULT '',
  author  TEXT    NOT NULL,
  created INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jokes_feed    ON jokes (lang, hidden);
CREATE INDEX IF NOT EXISTS idx_jokes_author  ON jokes (author, created DESC);
CREATE INDEX IF NOT EXISTS idx_jokes_rate    ON jokes (author, created);
CREATE INDEX IF NOT EXISTS idx_comments_tgt  ON comments (target, id DESC);
CREATE INDEX IF NOT EXISTS idx_comments_rate ON comments (author, created);
