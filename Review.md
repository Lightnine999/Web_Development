# AIFFEL Campus Code Peer Review Templete
- 코더 : 권광구
- 리뷰어 : 김송이

# PRT(Peer Review Template)

[x]  **1. 주어진 문제를 해결하는 완성된 코드가 제출되었나요?**
- 문제에서 요구하는 기능이 정상적으로 작동하는지?
  - 회원 인증 → 회사명/자료 입력 → Codex CLI를 통한 12장 Slide Plan 생성 → PPTX 렌더링 → Storage 저장 및 다운로드 URL 반환 흐름이 코드로 연결되어 있습니다.
  - `src/app/api/generate/route.ts`에서 로그인 확인, 입력 검증, `generateSlidePlan()`, `renderDeck()`, Storage 업로드까지 한 요청 흐름으로 구현되어 있습니다.
  - README에서도 12장 생성 검증을 위해 `npm run check:codex`를 제공하고 있으며, 실제 Codex 호출 후 12장 생성 및 형식까지 확인하도록 되어 있습니다.

### 핵심 코드 근거
![1번 핵심 코드](https://raw.githubusercontent.com/songyee-ai/Lightnine999_Web_Development/main/review_evidence/01_generation_flow.png)

**판단:** 단순히 화면만 구현한 것이 아니라 입력값 검증부터 AI 생성, PPTX 변환, 저장까지 실제 서비스에 필요한 핵심 흐름이 연결되어 있어 완성된 기능으로 판단했습니다. README에는 생성 검증 명령과 생성 조건도 함께 명시되어 있습니다.

---

[x]  **2. 핵심적이거나 복잡하고 이해하기 어려운 부분에 작성된 설명을 보고 해당 코드가 잘 이해되었나요?**
- 해당 코드 블럭에 doc string/annotation/markdown이 달려 있는지 확인
- 특히 Codex CLI 호출 방식, timeout, 오류 분류, 프롬프트의 생성 규칙처럼 복잡한 부분에 주석이 충분히 작성되어 있습니다.
- `generate.ts`에는 왜 240초 timeout을 사용하는지 실제 측정값과 함께 설명되어 있고, JSON Schema 검증 실패 시 재시도하는 이유도 코드에 드러납니다.

### 핵심 코드 근거
![2번 핵심 코드](https://raw.githubusercontent.com/songyee-ai/Lightnine999_Web_Development/main/review_evidence/02_codex_design.png)

**판단:** 복잡한 로직을 코드만 보고 추측하게 하지 않고, 주석으로 **무엇을 하는지 + 왜 그렇게 했는지 + 어떤 제약이 있는지**를 함께 설명한 점이 좋았습니다. 특히 로컬 Codex CLI라는 특수한 실행 환경과 12장 JSON Schema 제약이 명확하게 드러납니다.

---

[x]  **3. 에러가 난 부분을 디버깅하여 “문제를 해결한 기록”을 남겼나요? 또는 “새로운 시도 및 추가 실험”을 해봤나요?**
- `generate.ts`에 Codex 실행 시간에 대한 실제 측정값(약 400자 111초, 9,803자 139초)을 기록하고, 이를 바탕으로 timeout을 240초로 결정한 과정이 남아 있습니다.
- README의 `npm run check:codex`는 실제 Codex를 호출하여 12장 생성과 출력 형식을 확인하는 별도의 검증 절차입니다.
- 또한 JSON Schema 검증에 실패하면 한 번 더 재시도하도록 구현하여 AI 출력의 불안정성을 보완했습니다.

### 핵심 코드 근거
![3번 핵심 코드](https://raw.githubusercontent.com/songyee-ai/Lightnine999_Web_Development/main/review_evidence/04_documented_experiment.png)

**판단:** 별도의 회고 문서 형태의 디버깅 로그는 아니지만, 실제 실행 시간을 측정하고 그 결과를 기준으로 timeout을 정한 실험 기록이 코드에 남아 있습니다. 또한 실패 상황을 구분하고 재시도하는 방어 로직도 추가되어 있어 3번 조건의 ‘새로운 시도 및 추가 실험’에 해당한다고 판단했습니다.

---

[ ]  **4. 회고를 잘 작성했나요?**
- 프로젝트 결과물에 대해 배운점과 아쉬운점, 느낀점 등이 상세히 기록 되어 있나요?
- `README.md`, `docs/DESIGN.md`, `docs/FRONTEND_PRD_REVIEW.md`에는 설계 의도, 제약, 미구현 기능, 의사결정 등이 상당히 구체적으로 기록되어 있습니다.
- 다만 이번 템플릿에서 요구하는 **프로젝트를 진행하며 배운 점 / 아쉬운 점 / 느낀 점을 정리한 회고 글 자체는 확인하지 못했습니다.**

**판단:** 설계 문서와 PRD 검토 기록은 충분하지만, ‘회고’라는 관점에서 프로젝트 경험을 정리한 내용은 별도로 보이지 않아 체크하지 않았습니다.

---

[x]  **5. 코드가 간결하고 효율적인가요?**
- 기능별 책임이 비교적 명확하게 분리되어 있습니다.
- `src/lib/deck/` 아래에서 `generate.ts`, `generate-client.ts`, `render.ts`, `schema.ts` 등 역할별 파일로 나누어 관리하고 있습니다.
- `backend/server.ts`는 Codex 실행 서버 역할만 담당하고, Next.js API route에서는 인증/입력 검증/렌더링/저장을 조합하는 구조입니다.
- 공통 입력 검증에는 Zod Schema를 사용하여 타입과 런타임 검증을 함께 처리합니다.

### 핵심 코드 근거
![5번 핵심 코드](https://raw.githubusercontent.com/songyee-ai/Lightnine999_Web_Development/main/review_evidence/03_backend_boundary.png)

**판단:** 하나의 파일에 모든 기능을 몰아넣기보다 생성, 렌더링, 스키마, 백엔드 실행을 역할별로 분리해 재사용성과 유지보수성을 고려한 구조로 판단했습니다. 또한 주석을 통한 설계 의도 설명도 있어 코드의 역할을 파악하기 쉽습니다.

---

# 참고 링크 및 코드 개선

## 1.코드 리뷰 시 참고한 링크가 있다면 링크와 간략한 설명을 첨부합니다.

- GitHub 저장소: https://github.com/songyee-ai/Lightnine999_Web_Development
  - 전체 프로젝트 구조 및 README 확인
- `src/app/api/generate/route.ts`
  - 사용자 입력 검증 → Codex 생성 → PPTX 렌더링 → Storage 저장 흐름 확인
- `src/lib/deck/generate.ts`
  - Codex CLI 호출, 프롬프트, timeout, 오류 분류, JSON Schema 재시도 로직 확인
- `backend/server.ts`
  - 백엔드 인증과 localhost 바인딩 구조 확인
- `docs/DESIGN.md`
  - 디자인 시스템 및 접근성 설계 의도 확인
- `docs/FRONTEND_PRD_REVIEW.md`
  - MVP 범위와 미결정 사항, 설계 의사결정 확인

## 2.코드 리뷰를 통해 개선을 제안할 코드가 있다면 코드와 간략한 설명을 첨부합니다.

### ① 테스트 코드 추가

README에 현재 `vitest·Playwright가 아직 없습니다`라고 명시되어 있습니다. 따라서 가장 먼저 **Codex 생성 로직과 API route에 대한 자동 테스트**를 추가하면 좋을 것 같습니다.

특히 다음 케이스를 우선적으로 테스트하면 좋습니다.

```text
- 잘못된 입력값 → 400 VALIDATION_FAILED
- PDF가 10MB 초과 → 400 FILE_TOO_LARGE
- PDF가 아닌 파일 → 400 FILE_TYPE_UNSUPPORTED
- 비로그인 사용자 → 401 UNAUTHORIZED
- Codex timeout → 504 CODEX_TIMEOUT
- JSON Schema 검증 실패 → 재시도 후 AI_SCHEMA_INVALID
- 정상 생성 → PPTX 저장 및 deckId 반환
```

### ② Codex 실행 환경과 웹 서비스의 분리

현재 `backend/server.ts`가 로컬 Codex CLI를 실행하는 구조이기 때문에 원격 배포 환경에서는 동작하지 않는 제약이 있습니다. README에도 이 점이 명시되어 있습니다.

향후 실제 서비스로 확장한다면 `generateSlidePlan()`이 특정 CLI에 직접 의존하지 않도록 **LLM provider interface를 하나 두고**, 로컬 Codex / 원격 API를 구현체로 분리하면 배포 환경 변화에 대응하기 쉬울 것 같습니다.

### 개선 제안 코드 구조 예시

```text
LLMProvider
 ├─ CodexCliProvider
 └─ RemoteApiProvider

generateSlidePlan()
        ↓
      LLMProvider
        ↓
    SlidePlan JSON
```

**총평**

전체적으로 단순히 ‘AI를 호출해서 PPT를 만드는 데모’에 그치지 않고, 입력 검증 → AI 출력 스키마 검증 → PPTX 렌더링 → 저장/다운로드까지 하나의 서비스 흐름으로 연결한 점이 인상적이었습니다.

특히 Codex CLI라는 실행 환경의 제약을 숨기지 않고 README와 코드 주석에 명시하고, 실제 실행 시간 측정값을 바탕으로 timeout을 결정한 부분이 좋았습니다.

반면 현재 테스트 코드가 없고, 프로젝트 회고가 별도로 정리되어 있지 않은 점은 아쉬웠습니다. 다음 단계에서는 자동 테스트를 추가하고, 로컬 Codex CLI에 대한 의존성을 추상화한다면 안정성과 배포 가능성이 더 높아질 것 같습니다.
