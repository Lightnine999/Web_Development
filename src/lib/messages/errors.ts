/**
 * 오류 코드 → 사용자 문구.
 * 화면에서 오류 문구를 문자열 리터럴로 쓰지 않고 전부 여기를 거친다.
 * 서버가 모르는 코드를 보내도 앱이 멈추지 않게 기본값을 둔다.
 */
export type ErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_FAILED"
  | "FILE_TOO_LARGE"
  | "FILE_TYPE_UNSUPPORTED"
  | "PARSE_FAILED"
  | "CODEX_NOT_INSTALLED"
  | "CODEX_NOT_AUTHENTICATED"
  | "CODEX_TIMEOUT"
  | "CODEX_FAILED"
  | "AI_SCHEMA_INVALID"
  | "STORAGE_UNAVAILABLE"
  | "NETWORK";

type Guidance = {
  /** 무엇이 일어났는지. 사용자를 탓하지 않는다 */
  message: string;
  /** 사용자가 할 수 있는 다음 행동. 없으면 null */
  action: string | null;
  /** 같은 입력으로 다시 눌러 볼 만한가 */
  retryable: boolean;
};

const GUIDANCE: Record<ErrorCode, Guidance> = {
  UNAUTHORIZED: {
    message: "로그인이 풀렸습니다.",
    action: "다시 로그인한 뒤 시도해주세요.",
    retryable: false,
  },
  VALIDATION_FAILED: {
    message: "입력한 내용을 확인해주세요.",
    action: null,
    retryable: false,
  },
  FILE_TOO_LARGE: {
    message: "PDF가 10MB를 넘습니다.",
    action: "페이지를 나누거나 텍스트로 붙여넣어 주세요.",
    retryable: false,
  },
  FILE_TYPE_UNSUPPORTED: {
    message: "PDF 파일만 읽을 수 있습니다.",
    action: "다른 형식은 텍스트로 붙여넣어 주세요.",
    retryable: false,
  },
  PARSE_FAILED: {
    message: "PDF에서 글자를 읽지 못했습니다.",
    action: "스캔한 이미지 PDF일 수 있습니다. 텍스트로 붙여넣어 주세요.",
    retryable: false,
  },

  // 아래 네 가지는 이 컴퓨터의 Codex CLI 문제다. 원격 API와 달리
  // 사용자가 직접 손볼 수 있는 것이라 조치 방법을 구체적으로 알려준다.
  CODEX_NOT_INSTALLED: {
    message: "이 컴퓨터에서 Codex CLI를 찾지 못했습니다.",
    action:
      "자료 생성은 개발 서버가 돌아가는 컴퓨터의 Codex CLI로 처리합니다. 설치와 로그인 여부를 확인해주세요.",
    retryable: false,
  },
  CODEX_NOT_AUTHENTICATED: {
    message: "Codex CLI에 로그인되어 있지 않습니다.",
    action: "터미널에서 codex login 을 실행해 ChatGPT 계정으로 로그인한 뒤 다시 시도해주세요.",
    retryable: true,
  },
  CODEX_TIMEOUT: {
    message: "자료를 만드는 데 5분을 넘겨 중단했습니다.",
    action: "입력한 내용을 줄이면 대개 해결됩니다.",
    retryable: true,
  },
  CODEX_FAILED: {
    message: "자료를 만들지 못했습니다.",
    action: "잠시 후 다시 시도해주세요.",
    retryable: true,
  },
  AI_SCHEMA_INVALID: {
    message: "만들어진 내용이 12장 형식에 맞지 않아 쓰지 않았습니다.",
    action: "회사 정보를 조금 더 구체적으로 적으면 대개 해결됩니다.",
    retryable: true,
  },

  STORAGE_UNAVAILABLE: {
    message: "만든 파일을 저장하지 못했습니다.",
    action: "잠시 후 다시 시도해주세요.",
    retryable: true,
  },
  NETWORK: {
    message: "서버에 연결하지 못했습니다.",
    action: "개발 서버가 돌아가고 있는지 확인해주세요.",
    retryable: true,
  },
};

const FALLBACK: Guidance = {
  message: "자료를 만들지 못했습니다.",
  action: "잠시 후 다시 시도해주세요.",
  retryable: true,
};

export function describeError(code: string | undefined): Guidance {
  if (!code) return FALLBACK;
  return GUIDANCE[code as ErrorCode] ?? FALLBACK;
}
