# MSW 목 — 현재 연결 해제 상태

## 왜 꺼져 있나

이 목은 "백엔드 API가 미확정"이라는 전제로 만들었다. 그 전제가 무너졌다.
`POST /api/generate` + Supabase로 동작하는 **실제 구현이 이미 있고, 그쪽이 정본이다**
(2026-09-07 결정).

그래서 `src/app/layout.tsx`에서 `MockProvider` 연결을 떼어냈다. 파일은 남아 있지만
실행되지 않으므로 실제 API 호출을 가로챌 위험은 없다.

## 실제 계약과 어긋나는 점

| | 이 목이 가정한 것 | 실제 구현 |
| --- | --- | --- |
| 엔드포인트 | `/api/v1/*` 22개 | `POST /api/generate` 1개 |
| 입력 | 파일 20개 × 50MB + 텍스트 5만자 | 회사명 + 텍스트 5천자 또는 PDF 10MB |
| 흐름 | 프로젝트 → 자료 → 근거 검토 → Job 폴링 → Revision | 단일 동기 요청 (`maxDuration 60`) |
| 검증 | OpenAPI 스키마 | zod (`src/lib/deck/schema.ts`) |
| 근거 등급 | 사실·해석·추정 + 충돌 해소 | 없음 |

`openapi/ir-generator.yaml`과 `src/api/schema.d.ts`도 같은 이유로 실제 계약을 반영하지
않는다.

## 되살리려면

1. `src/app/layout.tsx`에서 `children`을 `<MockProvider>`로 감싼다
2. 목을 끄고 싶을 때는 `.env.local`에 `NEXT_PUBLIC_API_MOCKING=disabled`

되살릴 때는 **핸들러 경로를 실제 계약에 먼저 맞춰야 한다.** 지금 경로 그대로 켜면
존재하지 않는 엔드포인트를 목업하는 셈이다.

## 그래도 쓸 만한 부분

- `fixtures.ts` — 자료 상태 7종, 근거 등급 3종, 수치 상충, 자료 부족을 담은 예시 데이터.
  화면을 만들 때 어떤 상태를 다뤄야 하는지 목록으로 쓸 수 있다.
- `handlers.ts`의 `scenarios` — 429, 503, 생성 실패, 401을 강제하는 핸들러.
  컴포넌트 테스트에서 오류 화면을 확인할 때 경로만 바꿔 재사용할 수 있다.
- `advance()` — 폴링할 때마다 단계가 나아가는 작업 시뮬레이션. 진행 화면을 만들 때
  참고가 된다.

## 파일

| 파일 | 역할 |
| --- | --- |
| `handlers.ts` | 요청 핸들러 22개 + 실패 시나리오 4개 |
| `fixtures.ts` | 목 데이터. 시간은 `NOW` 고정값 기준 |
| `browser.ts` | Service Worker (dev) |
| `server.ts` | Node (Vitest, 서버측 fetch) |
| `MockProvider.tsx` | 워커 준비될 때까지 렌더를 붙잡는 게이트 |
