/* Cloudflare Pages Functions — DON'T SMILE 드립 API
   바인딩: D1 데이터베이스를 DB 라는 이름으로 wrangler.toml 에 연결한다. */

const HEAD = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: HEAD });
const bad  = (m, s = 400) => json({ error: m }, s);

/* 제어문자 제거 + 공백 정리 + 길이 제한 */
const clean = (v, max) =>
  String(v == null ? "" : v)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const rawId    = v => String(v == null ? "" : v).trim();
const isAuthor = a => typeof a === "string" && /^[a-z0-9]{12,64}$/.test(a);
const isTarget = t => /^(u[1-9][0-9]{0,11}|b_(ko|en)_[0-9]{1,4})$/.test(t);
const langOf   = v => (v === "en" ? "en" : "ko");

/* 같은 기기에서 1분 안에 너무 많이 쓰는 것만 막는다 */
async function tooFast(db, table, author, limit) {
  const r = await db
    .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE author = ? AND created > ?`)
    .bind(author, Date.now() - 60000)
    .first();
  return !!(r && r.n >= limit);
}

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return bad("D1 바인딩 DB 가 없습니다. wrangler.toml 을 확인하세요.", 503);

  const route = (params.route || []).join("/");
  const url = new URL(request.url);
  const q = url.searchParams;
  const method = request.method;

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: HEAD });

  try {
    /* ---------- 서버가 살아 있는지 ---------- */
    if (route === "ping") return json({ ok: true });

    /* ---------- 랜덤 피드 ---------- */
    if (route === "feed" && method === "GET") {
      const lang = langOf(q.get("lang"));
      const limit = Math.min(60, Math.max(1, parseInt(q.get("limit"), 10) || 40));
      const { results } = await db
        .prepare(
          `SELECT id, setup, punch, emoji, nick, laughs
             FROM jokes WHERE lang = ? AND hidden = 0
            ORDER BY RANDOM() LIMIT ?`
        )
        .bind(lang, limit)
        .all();
      return json({ jokes: results || [] });
    }

    /* ---------- 드립 등록 ---------- */
    if (route === "jokes" && method === "POST") {
      const b = await request.json().catch(() => ({}));
      const setup  = clean(b.setup, 60);
      const punch  = clean(b.punch, 40);
      const emoji  = clean(b.emoji, 8);
      const nick   = clean(b.nick, 16);
      const author = rawId(b.author);
      const lang   = langOf(b.lang);
      if (!setup || !punch) return bad("밑밥과 펀치라인을 모두 써 주세요");
      if (!isAuthor(author)) return bad("author 형식 오류");
      if (await tooFast(db, "jokes", author, 5)) return bad("잠깐 쉬었다 등록해 주세요", 429);

      const r = await db
        .prepare(
          `INSERT INTO jokes (setup, punch, emoji, lang, nick, author, created)
           VALUES (?,?,?,?,?,?,?)`
        )
        .bind(setup, punch, emoji, lang, nick, author, Date.now())
        .run();
      return json({ id: r.meta.last_row_id });
    }

    /* ---------- 내 드립 + 달린 댓글 수 ---------- */
    if (route === "mine" && method === "GET") {
      const author = rawId(q.get("author"));
      if (!isAuthor(author)) return bad("author 형식 오류");
      const { results } = await db
        .prepare(
          `SELECT j.id, j.setup, j.punch, j.emoji, j.lang, j.laughs, j.created,
                  (SELECT COUNT(*) FROM comments c WHERE c.target = 'u' || j.id) AS comments,
                  (SELECT MAX(c.id)  FROM comments c WHERE c.target = 'u' || j.id) AS last_comment
             FROM jokes j
            WHERE j.author = ? AND j.hidden = 0
            ORDER BY j.created DESC LIMIT 100`
        )
        .bind(author)
        .all();
      return json({ jokes: results || [] });
    }

    /* ---------- 드립 지우기 (내 것만) ---------- */
    if (route === "delete" && method === "POST") {
      const b = await request.json().catch(() => ({}));
      const author = rawId(b.author);
      const id = parseInt(b.id, 10);
      if (!isAuthor(author) || !(id > 0)) return bad("요청 형식 오류");
      const r = await db.prepare(`DELETE FROM jokes WHERE id = ? AND author = ?`).bind(id, author).run();
      if (!r.meta.changes) return bad("내 드립이 아닙니다", 403);
      await db.prepare(`DELETE FROM comments WHERE target = ?`).bind("u" + id).run();
      return json({ ok: true });
    }

    /* ---------- 댓글 읽기 ---------- */
    if (route === "comments" && method === "GET") {
      const target = clean(q.get("target"), 32);
      if (!isTarget(target)) return bad("target 형식 오류");
      const { results } = await db
        .prepare(
          `SELECT id, body, nick, created FROM comments
            WHERE target = ? ORDER BY id DESC LIMIT 100`
        )
        .bind(target)
        .all();
      return json({ comments: results || [] });
    }

    /* ---------- 댓글 쓰기 ---------- */
    if (route === "comments" && method === "POST") {
      const b = await request.json().catch(() => ({}));
      const target = clean(b.target, 32);
      const body   = clean(b.body, 140);
      const nick   = clean(b.nick, 16);
      const author = rawId(b.author);
      if (!isTarget(target)) return bad("target 형식 오류");
      if (!body) return bad("댓글을 써 주세요");
      if (!isAuthor(author)) return bad("author 형식 오류");
      if (await tooFast(db, "comments", author, 10)) return bad("잠깐 쉬었다 남겨 주세요", 429);

      const r = await db
        .prepare(`INSERT INTO comments (target, body, nick, author, created) VALUES (?,?,?,?,?)`)
        .bind(target, body, nick, author, Date.now())
        .run();
      return json({ id: r.meta.last_row_id });
    }

    /* ---------- 이 개그에 웃었다 ---------- */
    if (route === "laugh" && method === "POST") {
      const b = await request.json().catch(() => ({}));
      const target = clean(b.target, 32);
      if (!isTarget(target)) return bad("target 형식 오류");
      if (target[0] === "u") {
        await db
          .prepare(`UPDATE jokes SET laughs = laughs + 1 WHERE id = ?`)
          .bind(parseInt(target.slice(1), 10))
          .run();
      }
      return json({ ok: true });
    }

    return bad("없는 경로: " + route, 404);
  } catch (e) {
    return bad(String((e && e.message) || e), 500);
  }
}
