import { CodexError, type CodexFailure } from "./generate";
import { SlidePlanSchema, type SlidePlan } from "./schema";

/**
 * generate.ts의 generateSlidePlan과 같은 자리를 대신한다 — 이 프로세스 안에서
 * codex를 직접 spawn하는 대신, 같은 컴퓨터의 다른 포트에 떠 있는
 * backend/server.ts에 HTTP로 요청한다. 실제 Codex CLI 호출은 그 서버가 한다.
 */

// generate.ts의 CODEX_TIMEOUT_MS(240초)보다 커야 한다 — 백엔드가 스스로 시간을
// 넘겨 에러 응답을 보낼 시간을 먼저 준 뒤에 이쪽이 포기해야 한다.
const FETCH_TIMEOUT_MS = 260_000;

type BackendErrorBody = { error?: { code?: CodexFailure; message?: string } };

export async function generateSlidePlan(
  companyName: string,
  sourceText: string,
): Promise<SlidePlan> {
  const baseUrl = process.env.BACKEND_URL ?? "http://localhost:8787";
  const secret = process.env.BACKEND_SECRET;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-api-key": secret } : {}),
      },
      body: JSON.stringify({ companyName, sourceText }),
      signal: controller.signal,
    });
  } catch (err) {
    // 대개 backend/server.ts 가 떠 있지 않은 것이다. 일반 실패로 뭉치면
    // "잠시 후 다시 시도" 안내가 나가 사용자가 원인을 못 찾는다.
    const code = controller.signal.aborted ? "CODEX_TIMEOUT" : "BACKEND_UNREACHABLE";
    throw new CodexError(code, `백엔드에 연결하지 못했습니다: ${String(err)}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as BackendErrorBody | null;
    throw new CodexError(
      body?.error?.code ?? "CODEX_FAILED",
      body?.error?.message ?? `백엔드 응답 실패 (HTTP ${res.status})`,
    );
  }

  const json = await res.json();
  const parsed = SlidePlanSchema.safeParse(json);
  if (!parsed.success) {
    throw new CodexError("AI_SCHEMA_INVALID", "백엔드 응답이 SlidePlan 형식이 아닙니다");
  }
  return parsed.data;
}
