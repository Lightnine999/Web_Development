<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# IR 자료 생성 서비스

회사 정보를 붙여넣거나 PDF로 올리면 12장짜리 IR 발표자료(PPTX)를 만들어 주는 웹 서비스다.
Next.js 16.3.4 · React 19.2.8 · Tailwind 4 · TypeScript 5 · Supabase(인증·DB·Storage).

## 먼저 알아야 할 함정

여기서 실제로 사고가 났던 것들이다. 코드를 건드리기 전에 읽어라.

### LLM은 원격 API가 아니라 이 컴퓨터의 Codex CLI다

`src/lib/deck/generate.ts`가 `spawn("codex", ...)`로 로컬 CLI를 부른다. ChatGPT 구독으로
동작해 API 과금이 없는 대신 조건이 붙는다.

- `codex` 명령이 PATH에 있고 ChatGPT 계정으로 로그인돼 있어야 한다 (`codex login status`)
- `npm run dev`가 **이 컴퓨터에서** 떠 있을 때만 생성이 된다
- Vercel 같은 원격 배포에는 `codex` 바이너리가 없어 항상 실패한다

그러므로 **LLM API 키를 추가하지 마라.** `.env.local.example`에 LLM 키 항목이 없는 것은
누락이 아니라 의도다. 배포가 필요해지면 `generate.ts`의 호출 경로를 바꾸는 것이 먼저다.

### `NEXT_PUBLIC_` 에 비밀 값을 넣지 마라

이 접두사가 붙은 값은 빌드 시 **브라우저 번들에 그대로 인라인된다.**
2026-09-08에 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 자리에 Supabase `sb_secret_` 키가 들어가
있었다. 이 키는 service role급이라 RLS를 설계상 우회하므로, 정책이 다 걸려 있는데도
익명 요청으로 남의 자료가 전부 조회되고 PPTX가 다운로드됐다.

`sb_publishable_`(공개용)과 `sb_secret_`(비밀)은 길이가 46자 대 41자로 비슷해 눈으로
구별되지 않는다. 눈으로 보지 말고 검사해라.

```bash
npm run check:env      # 키 종류를 판정한다. 값은 출력하지 않는다
```

**RLS가 안 듣는 것처럼 보이면 정책을 고치기 전에 키 종류를 먼저 의심해라.** 정책 실제
상태는 Supabase MCP(`get_advisors`, `execute_sql`)로 확인한다. 증상만 보고 단정하지 마라.

### 제한시간 두 개의 순서가 뒤바뀌면 오류 안내가 죽는다

`CODEX_TIMEOUT_MS`(generate.ts, 240초)는 `maxDuration`(route.ts, 300초)보다 **반드시
작아야 한다.** 같거나 크면 Codex가 시간을 다 썼을 때 렌더·업로드에 남는 시간이 없어,
`CODEX_TIMEOUT` 안내 대신 라우트가 먼저 끊기고 사용자는 원인 모를 502를 본다.

실측(2026-09-08): 약 400자 입력 111초, 9,803자 139초. 입력이 24배여도 25%만 늘었다.
시간은 대부분 12장 JSON을 써내는 출력이 결정한다(1,000자당 약 3초). 상한 30,000자를
외삽하면 약 200초다.

### 여러 세션이 같은 파일을 동시에 고친다

`page.tsx`·`layout.tsx`·`globals.css`·`route.ts`가 몇 분 간격으로 오간 적이 있다.
공유 파일을 덮어쓰기 전에 현재 내용을 다시 읽어라. 최근 변경 확인:

```bash
find src -type f -newermt "-30 minutes"
```

전체 덮어쓰기보다 정밀 치환을 쓰고, 커밋 직전에 한 번 더 확인해라.

## 아키텍처

### API는 엔드포인트 하나다

`POST /api/generate` — FormData로 받아 동기 처리하고 PPTX를 만들어 저장한다.

| 항목 | 값 |
| --- | --- |
| 입력 | `companyName`(60자), `sourceType`(text\|pdf), `sourceText`(30,000자) 또는 `file`(PDF 10MB) |
| 검증 | zod · `src/lib/deck/schema.ts` |
| 응답 | `{ deckId, downloadUrl }` 또는 `{ error: { code, message } }` |
| 저장 | Storage `decks/${user_id}/${deck_id}.pptx` + `decks` 테이블 |

프로젝트 관리, 자료 검토, 근거 추적, Job 폴링, Revision 같은 개념은 **이 MVP에 없다.**

### 화면은 한 페이지다

`/`에 입력 폼과 생성 이력이 함께 있다. 생성은 동기 요청이라 진행률 표시나 단계 목록이
없고, 버튼이 대기 상태로 바뀌는 것이 전부다. 완료되면 폼 아래에 다운로드 링크가 붙고
`router.refresh()`로 이력이 갱신된다.

인증 게이트는 `src/proxy.ts`에 있다. Next 16에서 `middleware`가 `proxy`로 개명됐고
런타임은 nodejs 고정이다. 공식 문서가 proxy를 전체 인가 수단으로 쓰지 말라고 하므로,
여기서는 낙관적 체크만 하고 실제 소유권 검증은 페이지·서버 액션에서 한다.

### 오류 문구는 한 파일에 모은다

`src/lib/messages/errors.ts`가 코드 → 사용자 문구 매핑을 갖는다. 화면에서 오류 문구를
문자열 리터럴로 쓰지 말고 `describeError(code)`를 거쳐라. 무엇이 일어났는지 한 줄,
무엇을 하면 되는지 한 줄로 나눠 보여준다. 모르는 코드가 와도 기본 안내로 떨어진다.

## 손대지 말 것

다음 셋은 **연결이 끊긴 죽은 초안이다.** PRD 전문을 옮긴 것이라 실제 계약(엔드포인트 1개)과
범위가 다르다. 참고 자료로 남겼을 뿐이니 되살리거나 여기에 맞춰 코드를 짜지 마라.

| 경로 | 정체 |
| --- | --- |
| `openapi/ir-generator.yaml` | 22개 엔드포인트 API 초안. 정본 아님 |
| `src/api/schema.d.ts`, `types.ts` | 위 스펙에서 생성한 타입 |
| `src/mocks/` | MSW 핸들러. `layout.tsx`에서 떼어내 실행되지 않는다 |

이유와 되살리는 조건은 `src/mocks/README.md`에 있다.

## 디자인

`docs/DESIGN.md`가 색·활자·간격의 단일 기준이고, 구현은 `src/app/globals.css`의 `@theme`다.
UI를 바꾸면 같은 커밋에서 그 문서도 고쳐라.

**Tailwind 기본 팔레트는 꺼져 있다** (`--color-*: initial`). `text-gray-500` 같은 클래스는
아무 효과가 없다. 정의된 토큰만 쓴다: `paper` `surface` `ink` `ink-muted` `ink-faint`
`rule` `rule-soft` `seal` `warn` `danger` `ok` `focus`.

색 토큰을 바꾸면 **대비를 다시 계산해라.** 잉크 3단계는 WCAG AA를 실제로 재서 정한 값이고
(`ink-faint`는 4.65:1로 하한에 붙어 있다) 눈대중으로 밝히면 위반이다.

근거 등급(사실·해석·추정·자료 부족)은 색이 아니라 본문 왼쪽 방주 색단의 위치와 활자로
표시한다. 그래서 색상 단독 구분 금지(A11Y-009)가 구조로 충족된다.

## 검증

완료를 주장하기 전에 실행해라.

```bash
npm run build              # 타입체크 + 프로덕션 빌드
npm run lint
npm run check:env          # .env.local 의 키가 안전한지 (값은 출력하지 않음)
npm run check:codex        # LLM 경로만 확인 (Supabase·로그인 불필요)
npm run check:codex -- scripts/sample-long.txt   # 긴 입력 제한시간 실측
npm run codegen            # openapi/*.yaml → src/api/schema.d.ts (죽은 경로이므로 보통 불필요)
```

`check:codex`는 Codex를 실제로 호출해 2~3분 걸린다. 12장이 나오고 `visualType`에 맞는
필드만 채워졌는지까지 본다.

`scripts/` 아래 스크립트는 `tsx`로 돈다. devDependency에 있으니 `npm run`으로 실행해라.
`npx tsx`로 때우면 그 자리에서는 되지만 `package.json` 스크립트가 깨진 것을 못 잡는다.

DB·RLS 상태는 Supabase MCP로 확인한다. DDL을 바꾼 뒤에는 `get_advisors`(security)를
돌려 정책 누락을 잡아라.

## 문서 지도

| 파일 | 내용 |
| --- | --- |
| `docs/DESIGN.md` | 색·활자·간격·컴포넌트 규칙 (시각 SSOT) |
| `docs/FRONTEND_PRD_REVIEW.md` | 원본 PRD 검토 의견서. 확정한 수치와 미결정 처리 결과 |
| `src/mocks/README.md` | 죽은 초안의 정체와 되살리는 조건 |
| `supabase/migrations/` | 스키마와 RLS 정책 |
| `design/*.dc.html` | Claude Design 캔버스 작업 파일 |

`docs/FRONTEND_PRD_REVIEW.md`에 업로드 제한·오류 코드 카탈로그·멱등성 키 같은 확정 수치가
정리돼 있다. 그런 값이 필요하면 새로 정하기 전에 거기를 먼저 봐라.
