import { z } from "zod";

/**
 * 사용자 입력 제한. 클라이언트 표시와 별개로 서버가 다시 검증한다.
 * 실제 IR PDF 한 건(31장)을 텍스트로 뽑으면 17,700자가 나와, 5,000자로는
 * PDF 업로드 경로 자체가 항상 막혔다. 붙여넣기·PDF 공용으로 여유 있게 잡는다.
 */
export const MAX_INPUT_TEXT_CHARS = 30000;
export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB

export const GenerateInputSchema = z.object({
  companyName: z.string().trim().min(1, "회사명을 입력하세요").max(60),
  sourceText: z
    .string()
    .trim()
    .min(1, "내용을 입력하세요")
    .max(MAX_INPUT_TEXT_CHARS, `최대 ${MAX_INPUT_TEXT_CHARS}자까지 입력할 수 있습니다`),
});

const cardItem = z.object({
  label: z.string().max(16),
  value: z.string().max(45),
});

const timelineItem = z.object({
  year: z.string().max(10),
  text: z.string().max(60),
});

const flowStep = z.object({
  label: z.string().max(16),
  text: z.string().max(50),
});

const metricItem = z.object({
  value: z.string().max(12),
  label: z.string().max(20),
});

/**
 * 슬라이드 하나는 4가지 시각 유형 중 하나만 실제로 쓰지만, 판별 유니온(oneOf)이 아니라
 * 평평한 구조로 둔다. OpenAI 구조화 출력(Codex CLI가 쓰는 response_format)은 배열
 * items 자리에 oneOf를 허용하지 않는다 ("'oneOf' is not permitted" 400 에러로 확인됨).
 * 대신 4개 필드를 전부 두고 visualType에 맞는 것만 채우게 한 뒤, 아래 superRefine으로
 * "맞는 필드만 채워졌는지"를 이 프로젝트가 직접 검증한다.
 */
const SlideBaseSchema = z.object({
  number: z.number().int().min(1).max(12),
  kicker: z.string().max(20),
  title: z.string().max(70),
  conclusion: z.string().max(90),
  evidenceNote: z.string().max(120).nullable(),
  visualType: z.enum(["cards", "timeline", "flow", "metrics"]),
  cardsItems: z.array(cardItem).min(2).max(5).nullable(),
  timelineItems: z.array(timelineItem).min(3).max(6).nullable(),
  flowSteps: z.array(flowStep).min(3).max(4).nullable(),
  metricsItems: z.array(metricItem).min(2).max(4).nullable(),
});

const VISUAL_TYPE_FIELD = {
  cards: "cardsItems",
  timeline: "timelineItems",
  flow: "flowSteps",
  metrics: "metricsItems",
} as const;

export const SlideSchema = SlideBaseSchema.superRefine((slide, ctx) => {
  const requiredField = VISUAL_TYPE_FIELD[slide.visualType];
  if (slide[requiredField] == null) {
    ctx.addIssue({
      code: "custom",
      message: `visualType이 ${slide.visualType}이면 ${requiredField}를 채워야 합니다`,
      path: [requiredField],
    });
  }
});

export const SlidePlanSchema = z.object({
  deckTitle: z.string().max(60),
  slides: z.array(SlideBaseSchema).length(12),
}).superRefine((plan, ctx) => {
  plan.slides.forEach((slide, index) => {
    const requiredField = VISUAL_TYPE_FIELD[slide.visualType];
    if (slide[requiredField] == null) {
      ctx.addIssue({
        code: "custom",
        message: `visualType이 ${slide.visualType}이면 ${requiredField}를 채워야 합니다`,
        path: ["slides", index, requiredField],
      });
    }
  });
});

export type SlidePlan = z.infer<typeof SlidePlanSchema>;
export type Slide = z.infer<typeof SlideBaseSchema>;
