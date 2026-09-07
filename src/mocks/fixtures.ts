/**
 * 목 데이터. 화면을 만들 때 필요한 상태를 모두 담는다.
 * 성공 경로만이 아니라 오류·자료 부족·수치 상충을 포함한다 (검토서 CONTRACT-003).
 *
 * 회사명과 수치는 PRD §2의 가상 회사를 확장한 예시다.
 */
import type {
  Artifact,
  DeckRevision,
  EvidenceSummary,
  Job,
  Project,
  ProjectSummary,
  Quota,
  SlidePreview,
  SourceAsset,
} from "@/api/types";

/** 목 데이터의 시간 기준. 테스트가 흔들리지 않게 고정값을 쓴다 */
export const NOW = "2026-09-07T18:22:00Z";
const at = (minutesAgo: number) =>
  new Date(Date.parse(NOW) - minutesAgo * 60_000).toISOString();

export const PROJECT_IDS = {
  /** 만들고 있는 중 — 진행 화면 확인용 */
  generating: "prj_wave",
  /** 완료 — 결과 화면 확인용 */
  completed: "prj_hangyeol",
  /** 읽기 실패로 멈춘 것 — 오류 복구 확인용 */
  failed: "prj_moraeseom",
  /** 자료 0개 — 빈 상태 확인용 */
  empty: "prj_daeseong",
} as const;

export const projectSummaries: ProjectSummary[] = [
  {
    id: PROJECT_IDS.generating,
    company_name: "샘플웨이브",
    purpose: "컨설팅 교육용",
    status: "generating",
    updated_at: at(3),
    source_count: 4,
  },
  {
    id: PROJECT_IDS.completed,
    company_name: "한결식품",
    purpose: "투자 유치용",
    status: "completed",
    updated_at: at(60 * 26),
    source_count: 6,
    latest_revision: {
      id: "rev_hangyeol_1",
      revision_number: 1,
      slide_count: 12,
      created_at: at(60 * 26),
    },
  },
  {
    id: PROJECT_IDS.failed,
    company_name: "모래섬 스튜디오",
    purpose: "파트너 제안용",
    status: "failed",
    updated_at: at(60 * 24 * 4),
    source_count: 2,
    last_error: {
      code: "FILE_ENCRYPTED",
      message: "source asset is password protected",
      retryable: false,
      request_id: "req_mock_0001",
    },
  },
  {
    id: "prj_ujuyangmal",
    company_name: "우주양말",
    purpose: "컨설팅 교육용",
    status: "completed",
    updated_at: at(60 * 24 * 9),
    source_count: 5,
    latest_revision: {
      id: "rev_uju_2",
      revision_number: 2,
      slide_count: 12,
      created_at: at(60 * 24 * 9),
    },
  },
  {
    id: PROJECT_IDS.empty,
    company_name: "대성정밀",
    purpose: "투자 유치용",
    status: "created",
    updated_at: at(60 * 24 * 17),
    source_count: 0,
  },
];

export const projects: Record<string, Project> = {
  [PROJECT_IDS.generating]: {
    ...projectSummaries[0],
    industry: "생활용품 기획·유통",
    period_start: "2019-03-01",
    period_end: "2026-08-31",
    audiences: ["창업자와 사업 담당자"],
    created_at: at(40),
    current_step: "job",
    active_job_id: "job_wave_1",
  },
  [PROJECT_IDS.completed]: {
    ...projectSummaries[1],
    industry: "식품 제조",
    period_start: "2016-01-01",
    period_end: "2026-08-31",
    audiences: ["투자자"],
    created_at: at(60 * 30),
    current_step: "deck",
    active_job_id: null,
  },
  [PROJECT_IDS.failed]: {
    ...projectSummaries[2],
    industry: "영상 제작",
    period_start: null,
    period_end: null,
    audiences: [],
    created_at: at(60 * 24 * 5),
    current_step: "sources",
    active_job_id: null,
  },
  [PROJECT_IDS.empty]: {
    ...projectSummaries[4],
    industry: null,
    period_start: null,
    period_end: null,
    audiences: [],
    created_at: at(60 * 24 * 17),
    current_step: "sources",
    active_job_id: null,
  },
};

export const quota: Quota = {
  file_count: 4,
  file_limit: 20,
  used_bytes: 35_651_584,
  byte_limit: 209_715_200,
};

/** 자료 목록. 상태를 골고루 담아 업로드 화면의 모든 행을 확인할 수 있게 한다 */
export const sources: Record<string, SourceAsset[]> = {
  [PROJECT_IDS.generating]: [
    {
      id: "src_intro",
      kind: "file",
      filename: "회사소개서.pdf",
      size_bytes: 13_002_342,
      content_type: "application/pdf",
      status: "ready",
      progress: 1,
      fact_count: 11,
      page_count: 24,
      created_at: at(38),
    },
    {
      id: "src_revenue",
      kind: "file",
      filename: "매출추이.xlsx",
      size_bytes: 860_160,
      content_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      status: "ready",
      progress: 1,
      fact_count: 9,
      created_at: at(37),
    },
    {
      id: "src_campaign",
      kind: "file",
      filename: "캠페인결과_2023.pptx",
      size_bytes: 21_600_666,
      content_type:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      status: "parsing",
      progress: 0.42,
      page_count: 18,
      created_at: at(35),
    },
    {
      id: "src_overseas",
      kind: "file",
      filename: "해외실적.xlsx",
      size_bytes: 319_488,
      content_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      status: "failed",
      progress: null,
      created_at: at(34),
      error: {
        code: "FILE_ENCRYPTED",
        message: "workbook is password protected",
        retryable: false,
        request_id: "req_mock_0002",
      },
    },
    {
      id: "src_photo",
      kind: "file",
      filename: "도쿄팝업_현장사진.jpg",
      size_bytes: 3_250_585,
      content_type: "image/jpeg",
      status: "ocr_queued",
      progress: null,
      created_at: at(33),
    },
    {
      id: "src_text",
      kind: "text",
      filename: null,
      size_bytes: null,
      content_type: null,
      status: "ready",
      progress: 1,
      fact_count: 2,
      char_count: 1840,
      created_at: at(32),
    },
  ],
  [PROJECT_IDS.failed]: [
    {
      id: "src_ms_deck",
      kind: "file",
      filename: "소개자료.pdf",
      size_bytes: 4_194_304,
      content_type: "application/pdf",
      status: "ready",
      progress: 1,
      fact_count: 5,
      page_count: 12,
      created_at: at(60 * 24 * 5),
    },
    {
      id: "src_ms_sales",
      kind: "file",
      filename: "매출.xlsx",
      size_bytes: 204_800,
      content_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      status: "failed",
      progress: null,
      created_at: at(60 * 24 * 5),
      error: {
        code: "FILE_ENCRYPTED",
        message: "workbook is password protected",
        retryable: false,
        request_id: "req_mock_0003",
      },
    },
  ],
  [PROJECT_IDS.empty]: [],
};

export const evidenceSummaries: Record<string, EvidenceSummary> = {
  [PROJECT_IDS.generating]: {
    company: {
      name: "샘플웨이브",
      industry: "생활용품 기획·유통",
      founded: "2019-03",
      period_start: "2019-03-01",
      period_end: "2026-08-31",
    },
    counts: {
      sources_total: 6,
      sources_ready: 4,
      facts: 28,
      needs_review: 2,
    },
    items: [
      {
        id: "ev_revenue_2024",
        grade: "fact",
        statement: "2024년 매출 17억원, 전년 대비 62% 증가",
        confidence: "high",
        sources: [
          {
            source_id: "src_revenue",
            footnote_number: 2,
            filename: "매출추이.xlsx",
            locator: "매출 시트 B12",
            excerpt: "2024 매출 1,700,000,000",
            checked_at: "2026-09-07",
          },
        ],
      },
      {
        id: "ev_cvs",
        grade: "fact",
        statement: "2023년 9월 편의점 체인 입점, 점포 1,240곳",
        confidence: "high",
        sources: [
          {
            source_id: "src_campaign",
            footnote_number: 3,
            filename: "캠페인결과_2023.pptx",
            locator: "7장",
            excerpt: "전국 1,240개 점포 입점 완료",
            checked_at: "2026-09-07",
          },
        ],
      },
      {
        id: "ev_turning_point",
        grade: "interpretation",
        statement:
          "편의점 입점이 성장 속도가 달라진 지점입니다. 입점 전 3개 분기 평균 성장률이 8%였고 이후 4개 분기 평균이 31%로 올랐습니다.",
        note: "두 자료의 수치를 이어 붙인 분석입니다. 자료에 직접 적힌 문장이 아닙니다.",
        confidence: "medium",
        sources: [
          {
            source_id: "src_revenue",
            footnote_number: 2,
            filename: "매출추이.xlsx",
            locator: "분기 시트 C4:C11",
            excerpt: null,
            checked_at: "2026-09-07",
          },
          {
            source_id: "src_campaign",
            footnote_number: 3,
            filename: "캠페인결과_2023.pptx",
            locator: "7장",
            excerpt: null,
            checked_at: "2026-09-07",
          },
        ],
      },
      {
        id: "ev_valuation",
        grade: "estimate",
        statement:
          "3년에서 5년 성장 시나리오를 3개 구간으로 제시합니다. 공식 기업가치 평가 자료가 없어 공개 자료 기반 시나리오로만 다룹니다.",
        note: "공식 감정가나 투자 권유가 아닙니다. 도달 조건을 함께 표시합니다.",
        confidence: "low",
        sources: [],
      },
    ],
    gaps: [
      {
        id: "gap_overseas",
        topic: "해외 상시 유통",
        message:
          "지금 자료에서는 2025년 6월 도쿄 팝업 한 번만 확인됩니다. 해외 진출 슬라이드는 상시 유통이 아니라 단기 시장 테스트로 표현합니다.",
        suggested_action: "계약서나 정산 자료를 올려주세요",
        affects_slides: [9],
      },
    ],
    conflicts: [
      {
        id: "cf_revenue_2024",
        metric: "2024년 매출",
        resolved: false,
        chosen_candidate_id: null,
        candidates: [
          {
            id: "cand_intro",
            value_text: "17억원",
            source: {
              source_id: "src_intro",
              footnote_number: 1,
              filename: "회사소개서.pdf",
              locator: "8페이지",
              excerpt: "2024년 매출 17억원 달성",
              checked_at: "2026-09-07",
            },
          },
          {
            id: "cand_xlsx",
            value_text: "16.7억원",
            source: {
              source_id: "src_revenue",
              footnote_number: 2,
              filename: "매출추이.xlsx",
              locator: "매출 시트 B12",
              excerpt: "2024 매출 1,670,000,000",
              checked_at: "2026-09-07",
            },
          },
        ],
      },
    ],
    sources: [
      {
        source_id: "src_intro",
        footnote_number: 1,
        filename: "회사소개서.pdf",
        locator: "24페이지",
        excerpt: null,
        checked_at: "2026-09-07",
      },
      {
        source_id: "src_revenue",
        footnote_number: 2,
        filename: "매출추이.xlsx",
        locator: "시트 3개",
        excerpt: null,
        checked_at: "2026-09-07",
      },
      {
        source_id: "src_campaign",
        footnote_number: 3,
        filename: "캠페인결과_2023.pptx",
        locator: "18장",
        excerpt: null,
        checked_at: "2026-09-07",
      },
      {
        source_id: "src_text",
        footnote_number: 4,
        filename: null,
        locator: "직접 입력한 설명",
        excerpt: null,
        checked_at: "2026-09-07",
      },
    ],
  },
};

/** 진행 중인 작업. 폴링할 때마다 단계가 앞으로 나아간다 (handlers.ts에서 처리) */
export const initialJob: Job = {
  id: "job_wave_1",
  project_id: PROJECT_IDS.generating,
  stage: "generating",
  progress: 0.68,
  started_at: at(4),
  finished_at: null,
  eta_seconds: 150,
  slides_done: 8,
  slides_total: 12,
  completed_stages: [
    { stage: "scanning", finished_at: at(4), detail: "파일이 안전한지 확인했습니다" },
    { stage: "parsing", finished_at: at(3), detail: "문서와 표를 읽었습니다" },
    { stage: "extracting", finished_at: at(3), detail: "사건과 수치 28건을 찾았습니다" },
    { stage: "analyzing", finished_at: at(2), detail: "성장 구조와 사업 모델을 분석했습니다" },
    { stage: "planning", finished_at: at(1), detail: "12장의 이야기 순서를 만들었습니다" },
  ],
  warnings: [
    {
      code: "EVIDENCE_GAP",
      message:
        "상시 유통을 확인할 자료가 없어 9번 슬라이드는 도쿄 팝업 한 건만 다룹니다.",
      affects_slides: [9],
    },
  ],
  revision_id: null,
};

const pptxArtifact: Artifact = {
  id: "art_wave_pptx",
  type: "pptx",
  filename: "샘플웨이브_성장_IR_시각화.pptx",
  size_bytes: 3_984_588,
  checksum: "sha256:9f2c1e",
  created_at: NOW,
  download_url: "https://mock.local/artifacts/art_wave_pptx.pptx",
  expires_at: at(-15),
};

const SLIDE_TITLES = [
  "표지",
  "핵심 요약",
  "성장 전환점",
  "인지도 누적 구조",
  "브랜드 방어력",
  "사업 모델",
  "협업 전략",
  "확장 증거",
  "해외 진출",
  "운영 모델",
  "위험과 다음 과제",
  "가치 전망",
];

export const deckRevisions: Record<string, DeckRevision> = {
  rev_wave_1: {
    id: "rev_wave_1",
    revision_number: 1,
    slide_count: 12,
    created_at: NOW,
    artifacts: [pptxArtifact],
    totals: { facts_used: 28, gaps: 1, estimates: 1 },
    slides: SLIDE_TITLES.map((title, i) => {
      const number = i + 1;
      const isOverseas = number === 9;
      const isValuation = number === 12;
      return {
        number,
        title,
        conclusion: isOverseas
          ? "해외 수요는 확인됐지만 상시 유통 근거는 없습니다"
          : isValuation
            ? "공개 자료 기반 시나리오 3개 구간을 제시합니다"
            : `${title}에 대한 결론`,
        grades: isOverseas
          ? (["fact"] as const).slice()
          : isValuation
            ? (["estimate"] as const).slice()
            : (["fact"] as const).slice(),
        evidence_refs: isOverseas
          ? [
              {
                source_id: "src_campaign",
                footnote_number: 3,
                filename: "캠페인결과_2023.pptx",
                locator: "14장",
                excerpt: "도쿄 시부야 팝업 2025.06.12 ~ 06.25, 방문 4,180명",
                checked_at: "2026-09-07",
              },
            ]
          : [],
        gaps: isOverseas
          ? [
              {
                id: "gap_overseas",
                topic: "해외 상시 유통",
                message: "계약서나 정산 자료를 올리면 이 칸을 채울 수 있습니다",
                suggested_action: "계약서나 정산 자료 추가",
                affects_slides: [9],
              },
            ]
          : [],
        warnings: [],
      };
    }),
  },
};

export const slidePreviews: Record<string, SlidePreview[]> = {
  rev_wave_1: SLIDE_TITLES.map((title, i) => ({
    number: i + 1,
    // 실제 이미지가 없으므로 회색 자리표시자를 인라인 SVG data URI로 준다.
    thumbnail_url: placeholder(320, 180, i + 1),
    large_url: placeholder(1600, 900, i + 1),
    width: 1600,
    height: 900,
    alt: `${i + 1}번 슬라이드 · ${title}`,
  })),
};

function placeholder(w: number, h: number, n: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="%23F8F7F4" stroke="%23DCDDE1"/><text x="50%" y="50%" font-family="monospace" font-size="${Math.round(h / 6)}" fill="%23A8ABB2" text-anchor="middle" dominant-baseline="middle">${n}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}
