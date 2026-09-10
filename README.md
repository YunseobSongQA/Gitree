# DON'T SMILE

웹캠이 웃음을 감지하는 "DON'T SMILE". 버틴 시간을 재고, 무너지는 순간을
9:16 영상으로 녹화해 공유합니다. 얼굴 인식은 전부 브라우저 안에서 돌고,
영상은 어디로도 전송되지 않습니다.

## 구성

| 경로 | 역할 |
|---|---|
| `index.html` | 게임 전체 (빌드 스텝 없는 바닐라 JS 단일 파일) |
| `functions/api/[[route]].js` | 드립 등록 · 랜덤 피드 · 댓글 API (Cloudflare Pages Functions) |
| `schema.sql` | D1 테이블 정의 |
| `wrangler.toml` | D1 바인딩 설정 |

`index.html` 만 올려도 게임은 완전히 동작합니다. 아래 D1 설정을 하면
드립이 **다른 사람에게도** 보이고, 댓글이 공유됩니다. 설정하기 전에는
등록한 드립과 댓글이 그 기기 안에만 저장됩니다.

## D1 붙이기

```bash
# 1. 데이터베이스를 만들고 출력된 database_id 를 wrangler.toml 에 붙여넣는다
npx wrangler d1 create dontlaugh

# 2. 테이블을 만든다
npx wrangler d1 execute dontlaugh --remote --file=schema.sql

# 3. 배포 (git push 하면 Pages 가 알아서 배포한다)
git push
```

Cloudflare 대시보드에서 하려면 **Workers & Pages → 프로젝트 → Settings →
Functions → D1 database bindings** 에서 변수 이름 `DB`, 데이터베이스
`dontlaugh` 로 연결하면 됩니다.

시작 화면 맨 아래 진단 줄의 `drip:server` 를 확인하면 연결된 것입니다.
`drip:local` 이면 아직 D1 이 안 붙은 상태입니다.

## 부적절한 드립 내리기

```bash
npx wrangler d1 execute dontlaugh --remote \
  --command "UPDATE jokes SET hidden = 1 WHERE id = 123"
```

## 진단 줄 읽는 법

시작 화면 맨 아래에 `c1 · https · secure · top · gum:y · rec:y · drip:server` 같은
한 줄이 있습니다.

- `c1` — 배포된 빌드
- `INSECURE` / `gum:N` — http 주소라 카메라를 못 씁니다
- `IFRAME` — 다른 페이지에 삽입돼 카메라가 막힙니다
- `cam:denied` — 브라우저에 차단으로 저장된 상태
- `drip:local` — D1 미연결
- `err:...` — 마지막 카메라 오류 이름
