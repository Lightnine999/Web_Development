import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { SlidePlanSchema, type SlidePlan } from "./schema";

/**
 * Codex CLI(로컬, ChatGPT 로그인)를 비대화형으로 호출해 SlidePlan을 만든다.
 * API 과금 없이 이미 구독된 계정으로 동작하는 대신, 이 CLI가 설치·로그인된
 * 이 컴퓨터에서 `next dev`가 실행 중일 때만 동작한다 — Vercel 등 원격 배포에서는
 * codex 바이너리 자체가 없어 이 경로가 실패한다.
 */
/**
 * 라우트의 maxDuration(300초)보다 반드시 작아야 한다. 같으면 Codex가 시간을 다 썼을 때
 * 렌더·업로드에 남는 시간이 없어, CODEX_TIMEOUT 안내 대신 라우트가 먼저 죽는다.
 *
 * 실측: 약 400자 입력이 111초, 9,803자가 139초. 입력이 24배여도 25%만 늘어
 * 시간은 대부분 12장 JSON을 써내는 출력이 결정한다(1,000자당 약 3초).
 * 상한 30,000자를 외삽하면 약 200초이므로 240초면 충분하고, 렌더·업로드 몫 60초가 남는다.
 */
const CODEX_TIMEOUT_MS = 240_000;

/**
 * Codex 실패는 원격 API 실패와 성격이 다르다. 모델이 답을 못 한 것이 아니라
 * 이 컴퓨터의 환경 문제인 경우가 많아서, 사용자에게 안내할 문구도 달라진다.
 */
export type CodexFailure =
  | "CODEX_NOT_INSTALLED"
  | "CODEX_NOT_AUTHENTICATED"
  | "CODEX_TIMEOUT"
  | "CODEX_FAILED"
  | "AI_SCHEMA_INVALID";

export class CodexError extends Error {
  constructor(
    readonly code: CodexFailure,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "CodexError";
  }
}

/** stderr에서 로그인 문제를 골라낸다. 판별이 안 되면 일반 실패로 둔다. */
function classifyStderr(stderr: string): CodexFailure {
  const lower = stderr.toLowerCase();
  const authHints = ["not logged in", "login", "unauthorized", "authenticat", "sign in", "api key"];
  return authHints.some((hint) => lower.includes(hint)) ? "CODEX_NOT_AUTHENTICATED" : "CODEX_FAILED";
}

const SYSTEM_PROMPT = `너는 회사 자료를 근거로 IR 컨설팅 자료의 12장 슬라이드 계획을 만드는 분석가다.

원칙:
- 입력 자료에 없는 사건, 수치, 협업사를 지어내지 않는다.
- 자료가 부족한 항목은 "공개 자료로 확인되지 않음" 형태로 그대로 표시한다. 빈칸을 임의로 채우지 않는다.
- 확인된 사실과 분석가의 해석, 가정이 들어간 시나리오를 문장에서 구분한다.
- 각 슬라이드는 하나의 결론만 전달한다. conclusion 필드에 그 결론 한 문장을 쓴다.
- evidenceNote에는 이 슬라이드의 근거가 입력 자료 어디에서 왔는지, 또는 어떤 자료가 부족한지 짧게 적는다. 근거가 필요 없는 슬라이드(표지 등)는 null로 둔다.
- 화살표 문자나 점 기호로 문장을 잇지 않는다.
- 반드시 정확히 12개 슬라이드를 만든다. 순서: 표지/핵심질문, Executive Summary, 성장 전환점, 인지도 구조, 브랜드 방어력, 수익 사다리, 협업 전략, 성장 증거와 핵심 지표, 해외 진출 단계, 운영 모델, 위험과 과제, 가치 시나리오.
- 슬라이드마다 visualType을 내용에 맞게 고른다: cards(개요·방어력·협업·위험 등 항목 나열), timeline(전환점·해외 진출처럼 시간 흐름), flow(수익 사다리·인지도 구조·운영 모델처럼 단계 흐름), metrics(핵심 지표·가치 시나리오처럼 큰 숫자).
- 각 슬라이드는 cardsItems, timelineItems, flowSteps, metricsItems 네 필드를 모두 갖는다. visualType과 이름이 맞는 필드 하나에만 배열을 채우고, 나머지 세 필드는 반드시 null로 둔다. 예: visualType이 "cards"면 cardsItems만 채우고 timelineItems·flowSteps·metricsItems는 null.

실행 방식:
- 셸 명령, 파일 조작, 웹 조회 등 어떤 도구도 쓰지 않는다. 주어진 텍스트만으로 답한다.
- 최종 응답은 지정된 JSON 스키마를 따르는 JSON만 출력한다. 설명 문장이나 코드 블록 표시를 덧붙이지 않는다.`;

function buildPrompt(companyName: string, sourceText: string, retryNote?: string) {
  const base = `${SYSTEM_PROMPT}\n\n분석 대상: ${companyName}\n\n입력 자료:\n${sourceText}`;
  return retryNote ? `${base}\n\n${retryNote}` : base;
}

/**
 * codex exec는 stdin이 파이프로 연결되면 "추가 입력이 있는지" 기다린다.
 * stdio를 ignore로 열어 즉시 EOF를 주지 않으면 응답이 끝난 뒤에도 멈춰 있는다.
 */
function runCodexProcess(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    const timer = setTimeout(() => child.kill("SIGTERM"), CODEX_TIMEOUT_MS);

    child.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      // codex 바이너리가 없다. 원격 배포(Vercel 등)는 항상 이 경로로 온다.
      reject(
        new CodexError(
          err.code === "ENOENT" ? "CODEX_NOT_INSTALLED" : "CODEX_FAILED",
          err.message,
        ),
      );
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (signal) {
        reject(new CodexError("CODEX_TIMEOUT", `${signal} 신호로 중단됨: ${stderr.slice(0, 300)}`));
      } else if (code !== 0) {
        reject(new CodexError(classifyStderr(stderr), `종료 코드 ${code}: ${stderr.slice(0, 300)}`));
      } else {
        resolve();
      }
    });
  });
}

async function runCodex(prompt: string, jsonSchema: object): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "ir-codex-"));
  const schemaPath = path.join(workDir, "schema.json");
  const outPath = path.join(workDir, "out.txt");

  try {
    await writeFile(schemaPath, JSON.stringify(jsonSchema));

    await runCodexProcess(
      [
        "exec",
        "-C",
        workDir,
        "--skip-git-repo-check",
        "--sandbox",
        "read-only",
        "--ephemeral",
        "--output-schema",
        schemaPath,
        "-o",
        outPath,
        prompt,
      ],
      workDir,
    );

    return await readFile(outPath, "utf-8");
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/** 사용자 입력을 12장 Slide Plan으로 만든다. 스키마 검증 실패 시 한 번 재시도한다. */
export async function generateSlidePlan(
  companyName: string,
  sourceText: string,
): Promise<SlidePlan> {
  const jsonSchema = z.toJSONSchema(SlidePlanSchema);

  const attempt = async (retryNote?: string): Promise<SlidePlan | null> => {
    const prompt = buildPrompt(companyName, sourceText, retryNote);
    const raw = await runCodex(prompt, jsonSchema);

    let candidate: unknown;
    try {
      candidate = JSON.parse(raw);
    } catch {
      return null;
    }

    const parsed = SlidePlanSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  };

  const first = await attempt();
  if (first) return first;

  const second = await attempt(
    "이전 응답이 요구한 형식(JSON 스키마)을 지키지 못했다. 정확히 12개 슬라이드로 다시 만들어라.",
  );
  if (!second) {
    throw new CodexError(
      "AI_SCHEMA_INVALID",
      "두 번 시도했지만 요구한 JSON 스키마를 지키지 못했다",
    );
  }
  return second;
}
