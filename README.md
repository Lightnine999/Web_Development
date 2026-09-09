# IR 자료 생성기 — 프론트엔드

회사 정보를 넣으면 근거가 붙은 IR 발표자료 12장(PPTX)을 만들어 주는 웹 서비스입니다.
**이 저장소는 프론트엔드(Next.js 앱)입니다.**

없는 사실을 지어내지 않는 것이 이 제품의 핵심입니다. 자료에서 확인된 것, 여러 자료를
이어 붙인 해석, 가정이 들어간 추정을 슬라이드에서 구분해 표시합니다.

## 구성

```
브라우저
   ↓
Next.js 앱 (이 저장소, :3000)      화면 · 인증 · PDF 텍스트 추출 · PPTX 렌더 · 저장
   ↓ HTTP
LLM 백엔드 (backend/, :8787)      Codex CLI 호출만 담당
   ↓ spawn
codex CLI                         이 컴퓨터에 설치된 것. ChatGPT 구독으로 동작
```

| 영역 | 위치 |
| --- | --- |
| 화면·라우팅·인증 | `src/app/` |
| PPTX 제작 | `src/lib/deck/` |
| PDF 텍스트 추출 | `src/lib/pdf.ts` |
| Supabase 클라이언트 | `src/lib/supabase/` |
| LLM 백엔드 | `backend/server.ts` — 아직 이 저장소 안에 있습니다 |
| 화면 설계 | `design/` (Claude Design 캔버스) |

**LLM 백엔드는 아직 별도 저장소로 분리되지 않았습니다.** 분리하면 아래 링크와 위 표를
갱신하세요.

```
백엔드 저장소: (아직 없음)
```

## 스택

Next.js 16.3.4 · React 19.2.8 · Tailwind CSS 4 · TypeScript 5 · Supabase(인증·DB·Storage)
· pptxgenjs · zod

## 시작하기

### 1. 의존성

```bash
npm install
```

### 2. 환경변수

`.env.local.example`을 복사해 `.env.local`로 저장한 뒤 값을 채웁니다.
**`.env*`는 `.gitignore`에 걸려 있어 커밋되지 않습니다.**

| 키 | 어디서 | 주의 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 같은 화면의 **publishable** 키 | 비밀 키를 넣으면 안 됩니다 |
| `BACKEND_URL` | `http://localhost:8787` | |
| `BACKEND_SECRET` | 임의의 긴 랜덤 문자열 | 없으면 백엔드가 뜨지 않습니다 |

`NEXT_PUBLIC_` 접두사가 붙은 값은 **빌드 시 브라우저 번들에 인라인됩니다.** 비밀 키를
넣으면 그대로 노출되고, Supabase 비밀 키는 RLS를 우회하므로 모든 사용자의 자료가
읽힙니다. 채운 뒤 확인하세요.

```bash
npm run check:env
```

키 종류를 판정해 안전한지 알려줍니다. 값 자체는 출력하지 않습니다.

### 3. 데이터베이스

`supabase/migrations/`의 SQL을 Supabase 대시보드 SQL Editor에서 실행합니다.
`decks` 테이블, Storage 버킷, RLS 정책 6개를 만듭니다. 정책이 없으면 아무것도 저장되지
않습니다.

### 4. 서버 두 개를 띄웁니다

```bash
npm run backend:dev
```

```bash
npm run dev
```

**둘 다 떠 있어야 생성이 됩니다.** 백엔드가 꺼져 있으면 화면에 "자료를 만드는 서버가
꺼져 있습니다"가 나옵니다.

## Codex CLI가 필요합니다

슬라이드 계획은 원격 LLM API가 아니라 **이 컴퓨터에 설치된 Codex CLI**가 만듭니다.
ChatGPT 구독으로 동작하므로 API 과금이 없는 대신 조건이 붙습니다.

```bash
codex --version
```

```bash
codex login status
```

`codex`가 PATH에 있고 `Logged in using ChatGPT` 상태여야 합니다.

- 생성은 ChatGPT 계정의 Codex **사용량 한도**를 씁니다. 한도에 걸리면 화면에 그렇게
  안내되고, 시간이 지나면 재설정됩니다.
- 백엔드는 `127.0.0.1`에만 바인딩됩니다. 같은 네트워크의 다른 기기가 이 계정의 한도를
  쓰지 못하게 하기 위한 것입니다.
- **Vercel 같은 원격 배포에서는 동작하지 않습니다.** 그 환경에는 `codex` 바이너리가
  없습니다. 배포하려면 LLM 호출을 원격 API로 바꿔야 합니다.

## 검증

```bash
npm run build
```

```bash
npm run lint
```

```bash
npm run check:codex
```

`check:codex`는 Supabase나 로그인 없이 LLM 경로만 확인합니다. Codex를 실제로 호출해
2~3분 걸리고, 12장이 나오는지와 형식을 지켰는지까지 봅니다.

## 문서

| 파일 | 내용 |
| --- | --- |
| `AGENTS.md` | 이 프로젝트의 제약과 함정. **코드를 건드리기 전에 읽으세요** |
| `docs/DESIGN.md` | 색·활자·간격·컴포넌트 규칙 (시각 SSOT) |
| `docs/FRONTEND_PRD_REVIEW.md` | PRD 검토 의견서. 확정한 수치와 미결정 처리 결과 |
| `src/mocks/README.md` | 연결이 끊긴 초안의 정체와 되살리는 조건 |

## 회고

만드는 동안 부딪힌 것과 배운 것은 블로그에 남겼습니다.

| 글 | 내용 |
| --- | --- |
| [프론트와 백엔드를 동시에 만들며 부딪힌 것들](https://lightnine999.github.io/blog_ggg/posts/parallel-frontend-backend/) | 세션 두 개를 병렬로 굴렸을 때의 조율 비용. 쓰이지 못한 1,916줄과 다음에 먼저 정할 세 가지 |
| [눈대중으로 틀린 프론트엔드 세 가지](https://lightnine999.github.io/blog_ggg/posts/frontend-eyeball-mistakes/) | 눈으로 봐서 괜찮아 보였는데 틀린 것들 |
| [무료 Codex CLI를 지키면서 Vercel에 배포하기](https://lightnine999.github.io/blog_ggg/posts/ir-generator-local-backend-vercel/) | 로컬 CLI를 유지한 채 프론트엔드만 배포한 과정 |

## 아직 없는 것

- **슬라이드 미리보기** — `renderDeck`이 PPTX 버퍼만 만들고 이미지를 렌더하지 않습니다.
  결과 페이지에서 다운로드는 되지만, 웹에서 바로 보려면 서버에 PPTX→이미지 변환 단계가
  붙어야 합니다.
- **원격 배포** — 위의 Codex CLI 제약 때문입니다.
- **테스트** — vitest·Playwright가 아직 없습니다.
