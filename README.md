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

`index.html` 만 올려도 게임은 완전히 동작합니다. 아래 D1 설정을 하면
드립이 **다른 사람에게도** 보이고, 댓글이 공유됩니다. 설정하기 전에는
등록한 드립과 댓글이 그 기기 안에만 저장됩니다.

## D1 붙이기

> 이 저장소에는 `wrangler.toml` 을 두지 않습니다. Cloudflare Pages 는
> `wrangler.toml` 이 있으면 그걸 설정의 기준으로 삼는데, 프로젝트 이름이
> 다르거나 `database_id` 가 비어 있으면 **빌드 자체가 실패**합니다.
> 바인딩은 대시보드에서 붙이는 쪽이 안전합니다.

1. **데이터베이스 만들기** — Cloudflare 대시보드 → **Storage & Databases →
   D1 → Create**, 이름은 `dontsmile`.

2. **테이블 만들기** — 그 D1 의 **Console** 탭에 `schema.sql` 내용을
   붙여넣고 실행합니다. CLI 를 쓴다면:

   ```bash
   npx wrangler d1 execute dontsmile --remote --file=schema.sql
   ```

3. **바인딩 연결** — **Workers & Pages → 프로젝트 → Settings → Bindings**
   에서 D1 database binding 을 추가합니다.
   변수 이름 `DB`, 데이터베이스 `dontsmile`.
   Production 과 Preview 양쪽에 넣어 주세요.

4. **다시 배포** — 바인딩은 다음 배포부터 적용됩니다.
   Deployments 에서 **Retry deployment** 를 누르거나 아무 커밋이나 푸시합니다.

시작 화면 맨 아래 진단 줄이 `drip:server` 가 되면 연결된 것입니다.
`drip:local` 이면 아직 안 붙은 상태이고, 그래도 게임과 드립 등록은
그 기기 안에서 정상 동작합니다.

## 배포가 반영되지 않을 때

1. **Workers & Pages → 프로젝트 → Deployments** 에서 마지막 배포가
   **Success** 인지 봅니다. Failed 면 로그에 이유가 찍혀 있습니다.
2. 시작 화면 맨 아래 진단 줄의 빌드 스탬프를 확인합니다.
   저장소의 `const BUILD` 값과 다르면 옛 배포가 떠 있는 것입니다.
3. 브라우저에서 강력 새로고침(Ctrl/Cmd+Shift+R) 을 한 번 합니다.

## 부적절한 드립 내리기

```bash
npx wrangler d1 execute dontsmile --remote \
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
