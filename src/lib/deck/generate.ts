import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SlidePlanSchema, type SlidePlan } from "./schema";

const MODEL = "claude-opus-5";

const SYSTEM_PROMPT = `너는 회사 자료를 근거로 IR 컨설팅 자료의 12장 슬라이드 계획을 만드는 분석가다.

원칙:
- 입력 자료에 없는 사건, 수치, 협업사를 지어내지 않는다.
- 자료가 부족한 항목은 "공개 자료로 확인되지 않음" 형태로 그대로 표시한다. 빈칸을 임의로 채우지 않는다.
- 확인된 사실과 분석가의 해석, 가정이 들어간 시나리오를 문장에서 구분한다.
- 각 슬라이드는 하나의 결론만 전달한다. conclusion 필드에 그 결론 한 문장을 쓴다.
- evidenceNote에는 이 슬라이드의 근거가 입력 자료 어디에서 왔는지, 또는 어떤 자료가 부족한지 짧게 적는다. 근거가 필요 없는 슬라이드(표지 등)는 null로 둔다.
- 화살표 문자나 점 기호로 문장을 잇지 않는다.
- 반드시 정확히 12개 슬라이드를 만든다. 순서: 표지/핵심질문, Executive Summary, 성장 전환점, 인지도 구조, 브랜드 방어력, 수익 사다리, 협업 전략, 성장 증거와 핵심 지표, 해외 진출 단계, 운영 모델, 위험과 과제, 가치 시나리오.
- 슬라이드마다 visualType을 내용에 맞게 고른다: cards(개요·방어력·협업·위험 등 항목 나열), timeline(전환점·해외 진출처럼 시간 흐름), flow(수익 사다리·인지도 구조·운영 모델처럼 단계 흐름), metrics(핵심 지표·가치 시나리오처럼 큰 숫자).`;

function buildUserPrompt(companyName: string, sourceText: string) {
  return `분석 대상: ${companyName}\n\n입력 자료:\n${sourceText}`;
}

/** 사용자 입력을 12장 Slide Plan으로 만든다. 스키마 검증 실패 시 한 번 재시도한다. */
export async function generateSlidePlan(
  companyName: string,
  sourceText: string,
): Promise<SlidePlan> {
  const client = new Anthropic();
  const userPrompt = buildUserPrompt(companyName, sourceText);

  const attempt = async (retryNote?: string) => {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(SlidePlanSchema) },
      messages: [
        {
          role: "user",
          content: retryNote ? `${userPrompt}\n\n${retryNote}` : userPrompt,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      throw new Error("AI_REFUSAL");
    }

    return response.parsed_output;
  };

  const first = await attempt();
  if (first) return first;

  const second = await attempt(
    "이전 응답이 요구한 형식(JSON 스키마)을 지키지 못했다. 정확히 12개 슬라이드로 다시 만들어라.",
  );
  if (!second) {
    throw new Error("AI_SCHEMA_INVALID");
  }
  return second;
}
