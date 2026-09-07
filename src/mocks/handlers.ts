/**
 * MSW 핸들러. 백엔드 스펙이 확정되기 전까지 이것으로 화면을 만든다.
 * 실제 API를 붙인 뒤에도 컴포넌트 테스트와 E2E에서 계속 쓴다 (검토서 CONTRACT-004).
 *
 * 타입은 openapi/ir-generator.yaml에서 생성한 것을 그대로 쓴다.
 * 응답 모양이 스펙과 어긋나면 여기서 타입 오류가 난다.
 */
import { HttpResponse, delay, http } from "msw";
import type {
  ApiError,
  DeckRevision,
  ErrorCode,
  Job,
  JobStage,
  ListProjectsResponse,
  ListSourcesResponse,
  PreviewsResponse,
  Project,
  ProjectCreate,
  SourceAsset,
} from "@/api/types";
import {
  deckRevisions,
  evidenceSummaries,
  initialJob,
  PROJECT_IDS,
  projects,
  projectSummaries,
  quota,
  slidePreviews,
  sources,
} from "./fixtures";

const BASE = "/api/v1";

/** 실제 서버의 지연을 흉내내 로딩 상태를 볼 수 있게 한다 */
const LATENCY = { fast: 120, normal: 320, slow: 700 } as const;

let requestSeq = 0;
const requestId = () => `req_mock_${String(++requestSeq).padStart(4, "0")}`;

function fail(status: number, code: ErrorCode, message: string, extra: Partial<ApiError> = {}) {
  const body: ApiError = {
    code,
    message,
    retryable: status >= 500 || code === "RATE_LIMITED" || code === "AI_PROVIDER_ERROR",
    request_id: requestId(),
    ...extra,
  };
  return HttpResponse.json(body, { status });
}

function notFound(what: string) {
  return HttpResponse.json(
    {
      code: "VALIDATION_FAILED" as ErrorCode,
      message: `${what} not found`,
      retryable: false,
      request_id: requestId(),
    } satisfies ApiError,
    { status: 404 },
  );
}

/* ────────────────────────────────────────────────────────────
   세션 안에서만 사는 가변 상태.
   워커를 다시 켜면 초기값으로 돌아간다.
   ──────────────────────────────────────────────────────────── */

const store = {
  projects: { ...projects },
  summaries: [...projectSummaries],
  sources: structuredClone(sources) as Record<string, SourceAsset[]>,
  evidence: structuredClone(evidenceSummaries),
  jobs: { [initialJob.id]: structuredClone(initialJob) } as Record<string, Job>,
  decks: structuredClone(deckRevisions) as Record<string, DeckRevision>,
  /** Idempotency-Key → job id. 같은 키로 두 번 오면 새 작업을 만들지 않는다 */
  idempotency: new Map<string, string>(),
  /** 만료된 다운로드 URL을 한 번은 실제로 만료시켜 재발급 흐름을 확인한다 */
  downloadUrlRefreshed: new Set<string>(),
  seq: 0,
};

const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${++store.seq}`;

/** 생성 작업의 단계 순서. 폴링할 때마다 한 칸 나아간다 */
const STAGE_ORDER: JobStage[] = [
  "scanning",
  "parsing",
  "extracting",
  "analyzing",
  "planning",
  "generating",
  "validating",
  "repairing",
  "completed",
];

const STAGE_DETAIL: Partial<Record<JobStage, string>> = {
  scanning: "파일이 안전한지 확인했습니다",
  parsing: "문서와 표를 읽었습니다",
  extracting: "사건과 수치 28건을 찾았습니다",
  analyzing: "성장 구조와 사업 모델을 분석했습니다",
  planning: "12장의 이야기 순서를 만들었습니다",
  generating: "슬라이드를 만들었습니다",
  validating: "글자와 도형이 잘 보이는지 확인했습니다",
  repairing: "찾은 문제를 고쳤습니다",
};

/**
 * 작업을 다음 단계로 옮긴다.
 * 진행률은 완료한 단계 수로만 계산한다 — 시간 경과로 올리지 않는다 (PRD §5.3).
 */
function advance(job: Job): Job {
  if (job.stage === "completed" || job.stage === "failed" || job.stage === "cancelled") {
    return job;
  }
  const i = STAGE_ORDER.indexOf(job.stage);
  const next = STAGE_ORDER[Math.min(i + 1, STAGE_ORDER.length - 1)];

  job.completed_stages = [
    ...job.completed_stages,
    {
      stage: job.stage,
      finished_at: new Date().toISOString(),
      detail: STAGE_DETAIL[job.stage] ?? null,
    },
  ];
  job.stage = next;
  job.progress = job.completed_stages.length / (STAGE_ORDER.length - 1);

  if (next === "generating") {
    job.slides_done = 8;
    job.slides_total = 12;
  }
  if (next === "completed") {
    job.progress = 1;
    job.finished_at = new Date().toISOString();
    job.eta_seconds = null;
    job.slides_done = 12;
    job.revision_id = "rev_wave_1";
    const p = store.projects[job.project_id];
    if (p) {
      p.status = "completed";
      p.current_step = "deck";
      p.active_job_id = null;
      p.latest_revision = {
        id: "rev_wave_1",
        revision_number: 1,
        slide_count: 12,
        created_at: job.finished_at,
      };
    }
  }
  return job;
}

export const handlers = [
  /* ── 프로젝트 ─────────────────────────────────────────── */

  http.get(`${BASE}/projects`, async ({ request }) => {
    await delay(LATENCY.normal);
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim().toLowerCase();
    const status = url.searchParams.get("status");

    let items = [...store.summaries];
    if (q) items = items.filter((p) => p.company_name.toLowerCase().includes(q));
    if (status) items = items.filter((p) => p.status === status);
    items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    return HttpResponse.json({
      items,
      page: { has_more: false, next_cursor: null },
    } satisfies ListProjectsResponse);
  }),

  http.post(`${BASE}/projects`, async ({ request }) => {
    await delay(LATENCY.normal);
    const body = (await request.json()) as ProjectCreate;

    if (!body.company_name?.trim()) {
      return fail(422, "VALIDATION_FAILED", "company_name is required", {
        field: "company_name",
      });
    }
    if (body.period_start && body.period_end && body.period_start > body.period_end) {
      return fail(422, "VALIDATION_FAILED", "period_start must precede period_end", {
        field: "period_start",
      });
    }

    const id = nextId("prj");
    const now = new Date().toISOString();
    const created: Project = {
      id,
      company_name: body.company_name,
      purpose: body.purpose,
      industry: body.industry ?? null,
      period_start: body.period_start ?? null,
      period_end: body.period_end ?? null,
      audiences: body.audiences ?? [],
      status: "created",
      source_count: 0,
      created_at: now,
      updated_at: now,
      current_step: "sources",
      active_job_id: null,
    };
    store.projects[id] = created;
    store.summaries.unshift(created);
    store.sources[id] = [];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get(`${BASE}/projects/:projectId`, async ({ params }) => {
    await delay(LATENCY.fast);
    const p = store.projects[params.projectId as string];
    return p ? HttpResponse.json(p) : notFound("project");
  }),

  http.patch(`${BASE}/projects/:projectId`, async ({ params, request }) => {
    await delay(LATENCY.normal);
    const p = store.projects[params.projectId as string];
    if (!p) return notFound("project");
    const patch = (await request.json()) as Partial<ProjectCreate>;
    if (patch.company_name !== undefined) {
      if (!patch.company_name.trim()) {
        return fail(422, "VALIDATION_FAILED", "company_name cannot be empty", {
          field: "company_name",
        });
      }
      p.company_name = patch.company_name;
    }
    if (patch.purpose !== undefined) p.purpose = patch.purpose;
    p.updated_at = new Date().toISOString();
    return HttpResponse.json(p);
  }),

  http.delete(`${BASE}/projects/:projectId`, async ({ params }) => {
    await delay(LATENCY.slow);
    const id = params.projectId as string;
    const p = store.projects[id];
    if (!p) return notFound("project");
    p.status = "deleting";
    // 삭제는 잠시 뒤 실제로 목록에서 사라진다 — "삭제 중" 상태를 확인할 수 있게
    setTimeout(() => {
      delete store.projects[id];
      store.summaries = store.summaries.filter((s) => s.id !== id);
      delete store.sources[id];
    }, 2500);
    return HttpResponse.json(p, { status: 202 });
  }),

  /* ── 자료 ─────────────────────────────────────────────── */

  http.post(`${BASE}/projects/:projectId/uploads`, async ({ params, request }) => {
    await delay(LATENCY.fast);
    const id = params.projectId as string;
    if (!store.projects[id]) return notFound("project");

    const body = (await request.json()) as {
      filename: string;
      size_bytes: number;
      content_type: string;
    };

    if (body.size_bytes > 52_428_800) {
      return fail(413, "FILE_TOO_LARGE", "file exceeds 50MB");
    }
    const list = store.sources[id] ?? [];
    if (list.length >= quota.file_limit) {
      return fail(409, "QUOTA_EXCEEDED", "project file limit reached");
    }

    const sourceId = nextId("src");
    return HttpResponse.json(
      {
        source_asset_id: sourceId,
        upload_url: `https://mock.local/upload/${sourceId}`,
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      },
      { status: 201 },
    );
  }),

  http.get(`${BASE}/projects/:projectId/sources`, async ({ params }) => {
    await delay(LATENCY.normal);
    const id = params.projectId as string;
    if (!store.projects[id]) return notFound("project");
    const items = store.sources[id] ?? [];
    return HttpResponse.json({
      items,
      quota: {
        ...quota,
        file_count: items.length,
        used_bytes: items.reduce((n, s) => n + (s.size_bytes ?? 0), 0),
      },
    } satisfies ListSourcesResponse);
  }),

  http.post(`${BASE}/projects/:projectId/sources/text`, async ({ params, request }) => {
    await delay(LATENCY.normal);
    const id = params.projectId as string;
    if (!store.projects[id]) return notFound("project");
    const { content } = (await request.json()) as { content: string };
    if (content.length > 50_000) {
      return fail(422, "VALIDATION_FAILED", "content too long", { field: "content" });
    }
    const asset: SourceAsset = {
      id: nextId("src"),
      kind: "text",
      filename: null,
      size_bytes: null,
      content_type: null,
      status: "ready",
      progress: 1,
      char_count: content.length,
      fact_count: 2,
      created_at: new Date().toISOString(),
    };
    (store.sources[id] ??= []).push(asset);
    return HttpResponse.json(asset, { status: 201 });
  }),

  http.delete(`${BASE}/projects/:projectId/sources/:sourceId`, async ({ params }) => {
    await delay(LATENCY.fast);
    const id = params.projectId as string;
    const list = store.sources[id];
    if (!list) return notFound("project");
    const i = list.findIndex((s) => s.id === params.sourceId);
    if (i < 0) return notFound("source");
    list.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE}/projects/:projectId/sources/:sourceId/retry`, async ({ params }) => {
    await delay(LATENCY.normal);
    const list = store.sources[params.projectId as string];
    const asset = list?.find((s) => s.id === params.sourceId);
    if (!asset) return notFound("source");

    // 암호가 걸린 파일은 다시 시도해도 열리지 않는다 — 사용자가 파일을 바꿔야 한다
    if (asset.error && !asset.error.retryable) {
      return fail(409, asset.error.code, "this failure is not retryable");
    }
    asset.status = "scanning";
    asset.progress = 0;
    asset.error = undefined;
    return HttpResponse.json(asset, { status: 202 });
  }),

  /* ── 근거 ─────────────────────────────────────────────── */

  http.get(`${BASE}/projects/:projectId/evidence/summary`, async ({ params }) => {
    await delay(LATENCY.slow);
    const id = params.projectId as string;
    const summary = store.evidence[id];
    if (!summary) {
      // 자료가 없으면 생성할 수 없다
      return fail(409, "INSUFFICIENT_EVIDENCE", "no readable source yet");
    }
    return HttpResponse.json(summary);
  }),

  http.get(`${BASE}/projects/:projectId/evidence/:evidenceId`, async ({ params }) => {
    await delay(LATENCY.fast);
    const summary = store.evidence[params.projectId as string];
    const ev = summary?.items.find((e) => e.id === params.evidenceId);
    return ev ? HttpResponse.json(ev) : notFound("evidence");
  }),

  http.post(
    `${BASE}/projects/:projectId/evidence/conflicts/:conflictId/resolve`,
    async ({ params, request }) => {
      await delay(LATENCY.normal);
      const summary = store.evidence[params.projectId as string];
      const conflict = summary?.conflicts.find((c) => c.id === params.conflictId);
      if (!conflict) return notFound("conflict");

      const { chosen_candidate_id } = (await request.json()) as {
        chosen_candidate_id: string;
      };
      if (!conflict.candidates.some((c) => c.id === chosen_candidate_id)) {
        return fail(422, "VALIDATION_FAILED", "unknown candidate", {
          field: "chosen_candidate_id",
        });
      }
      conflict.resolved = true;
      conflict.chosen_candidate_id = chosen_candidate_id;
      if (summary) {
        summary.counts.needs_review = Math.max(0, summary.counts.needs_review - 1);
      }
      return HttpResponse.json(conflict);
    },
  ),

  /* ── 생성 ─────────────────────────────────────────────── */

  http.post(`${BASE}/projects/:projectId/generations`, async ({ params, request }) => {
    await delay(LATENCY.normal);
    const id = params.projectId as string;
    const project = store.projects[id];
    if (!project) return notFound("project");

    const key = request.headers.get("Idempotency-Key");
    if (!key) {
      return fail(422, "VALIDATION_FAILED", "Idempotency-Key header is required");
    }

    // 같은 키가 다시 오면 새 작업을 만들지 않고 기존 작업을 409로 돌려준다
    const existing = store.idempotency.get(key);
    if (existing) {
      return HttpResponse.json(store.jobs[existing], { status: 409 });
    }
    if (!store.evidence[id]) {
      return fail(409, "INSUFFICIENT_EVIDENCE", "no readable source yet");
    }

    const jobId = nextId("job");
    const job: Job = {
      id: jobId,
      project_id: id,
      stage: "scanning",
      progress: 0,
      started_at: new Date().toISOString(),
      finished_at: null,
      eta_seconds: 330,
      slides_done: null,
      slides_total: 12,
      completed_stages: [],
      warnings: store.evidence[id]?.gaps.length
        ? [
            {
              code: "EVIDENCE_GAP",
              message:
                "상시 유통을 확인할 자료가 없어 9번 슬라이드는 도쿄 팝업 한 건만 다룹니다.",
              affects_slides: [9],
            },
          ]
        : [],
      revision_id: null,
    };
    store.jobs[jobId] = job;
    store.idempotency.set(key, jobId);
    project.status = "generating";
    project.current_step = "job";
    project.active_job_id = jobId;
    return HttpResponse.json(job, { status: 202 });
  }),

  /** 폴링. 부를 때마다 한 단계 나아간다 */
  http.get(`${BASE}/jobs/:jobId`, async ({ params }) => {
    await delay(LATENCY.fast);
    const job = store.jobs[params.jobId as string];
    if (!job) return notFound("job");
    return HttpResponse.json(advance(job));
  }),

  http.post(`${BASE}/jobs/:jobId/cancel`, async ({ params }) => {
    await delay(LATENCY.normal);
    const job = store.jobs[params.jobId as string];
    if (!job) return notFound("job");
    if (["completed", "failed", "cancelled"].includes(job.stage)) {
      return fail(409, "VALIDATION_FAILED", "job already finished");
    }
    job.stage = "cancelled";
    job.finished_at = new Date().toISOString();
    const p = store.projects[job.project_id];
    if (p) {
      p.status = "created";
      p.current_step = "review";
      p.active_job_id = null;
    }
    return HttpResponse.json(job, { status: 202 });
  }),

  /* ── 결과 ─────────────────────────────────────────────── */

  http.get(`${BASE}/projects/:projectId/decks`, async () => {
    await delay(LATENCY.fast);
    const items = Object.values(store.decks).map(
      ({ id, revision_number, slide_count, created_at, artifacts }) => ({
        id,
        revision_number,
        slide_count,
        created_at,
        artifacts,
      }),
    );
    return HttpResponse.json({ items });
  }),

  http.get(`${BASE}/projects/:projectId/decks/:revisionId`, async ({ params }) => {
    await delay(LATENCY.normal);
    const deck = store.decks[params.revisionId as string];
    return deck ? HttpResponse.json(deck) : notFound("revision");
  }),

  http.get(
    `${BASE}/projects/:projectId/decks/:revisionId/previews`,
    async ({ params }) => {
      await delay(LATENCY.normal);
      const items = slidePreviews[params.revisionId as string];
      if (!items) return notFound("revision");
      return HttpResponse.json({ items } satisfies PreviewsResponse);
    },
  ),

  /**
   * 다운로드 URL 재발급.
   * 처음 한 번은 만료된 URL을 그대로 두어 프론트가 재발급을 시도하게 만든다 (FE-111).
   */
  http.post(`${BASE}/artifacts/:artifactId/download-url`, async ({ params }) => {
    await delay(LATENCY.normal);
    const artifactId = params.artifactId as string;
    const known = Object.values(store.decks)
      .flatMap((d) => d.artifacts ?? [])
      .some((a) => a.id === artifactId);
    if (!known) return notFound("artifact");

    store.downloadUrlRefreshed.add(artifactId);
    return HttpResponse.json(
      {
        download_url: `https://mock.local/artifacts/${artifactId}.pptx?sig=${Date.now()}`,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      },
      { status: 201 },
    );
  }),
];

/** 테스트에서 특정 실패 경로를 강제할 때 쓴다 */
export const scenarios = {
  rateLimited: http.get(`${BASE}/projects`, () =>
    fail(429, "RATE_LIMITED", "too many requests", { retry_after_seconds: 30 }),
  ),
  serverError: http.get(`${BASE}/projects`, () =>
    HttpResponse.json(
      {
        code: "AI_PROVIDER_ERROR" as ErrorCode,
        message: "upstream unavailable",
        retryable: true,
        request_id: "req_mock_5xx",
      } satisfies ApiError,
      { status: 503 },
    ),
  ),
  generationFails: http.get(`${BASE}/jobs/:jobId`, ({ params }) => {
    const job = store.jobs[params.jobId as string];
    if (!job) return notFound("job");
    job.stage = "failed";
    job.error = {
      code: "GENERATION_TIMEOUT",
      message: "generation exceeded time limit",
      retryable: true,
      request_id: requestId(),
    };
    return HttpResponse.json(job);
  }),
  unauthorized: http.get(`${BASE}/projects`, () =>
    fail(401, "VALIDATION_FAILED", "session expired"),
  ),
};

export { PROJECT_IDS };
