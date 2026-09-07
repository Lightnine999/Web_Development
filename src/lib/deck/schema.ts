import { z } from "zod";

/** 사용자 입력 제한. 이 상한이 곧 비용 가드다 — 클라이언트 표시와 별개로 서버가 다시 검증한다. */
export const MAX_INPUT_TEXT_CHARS = 5000;
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

const slideBase = {
  number: z.number().int().min(1).max(12),
  kicker: z.string().max(20),
  title: z.string().max(70),
  conclusion: z.string().max(90),
  evidenceNote: z.string().max(120).nullable(),
};

export const SlideSchema = z.discriminatedUnion("visualType", [
  z.object({
    ...slideBase,
    visualType: z.literal("cards"),
    items: z.array(cardItem).min(2).max(5),
  }),
  z.object({
    ...slideBase,
    visualType: z.literal("timeline"),
    items: z.array(timelineItem).min(3).max(6),
  }),
  z.object({
    ...slideBase,
    visualType: z.literal("flow"),
    steps: z.array(flowStep).min(3).max(4),
  }),
  z.object({
    ...slideBase,
    visualType: z.literal("metrics"),
    items: z.array(metricItem).min(2).max(4),
  }),
]);

export const SlidePlanSchema = z.object({
  deckTitle: z.string().max(60),
  slides: z.array(SlideSchema).length(12),
});

export type SlidePlan = z.infer<typeof SlidePlanSchema>;
export type Slide = z.infer<typeof SlideSchema>;
