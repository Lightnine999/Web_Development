/**
 * LLM 경로가 살아있는지 확인한다. Supabase나 로그인 없이 Codex 호출만 검증한다.
 *   npx tsx scripts/check-codex.ts
 */
import { readFileSync } from "node:fs";
import { generateSlidePlan } from "../src/lib/deck/generate";

const SAMPLE = `샘플웨이브는 2019년 3월 두 명이 시작한 생활용품 기획·유통 회사다.
첫 제품은 주방 수납함이었고 온라인 자사몰로만 팔았다.
2021년 4월 인스타그램 릴스가 퍼지면서 월 매출이 처음 1억원을 넘었다.
2023년 9월 편의점 체인 1,240개 점포에 입점했다. 이후 4개 분기 평균 성장률이 31%로,
입점 전 3개 분기 평균 8%에서 크게 올랐다.
2024년 매출은 17억원으로 전년 대비 62% 늘었다.
2025년 6월 도쿄 시부야에서 2주간 팝업을 열어 4,180명이 방문했다.
해외 상시 유통 계약은 아직 없다.
직원은 11명이고 물류는 3자 물류사에 맡긴다.`;

async function main() {
 /** 인자로 파일을 주면 그 내용으로 잰다: npm run check:codex -- scripts/sample-long.txt */
const inputPath = process.argv[2];
const sourceText = inputPath ? readFileSync(inputPath, "utf-8") : SAMPLE;

const started = Date.now();
 try {
  const plan = await generateSlidePlan("샘플웨이브", sourceText);
  const secs = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`통과 · ${secs}초 · 입력 ${sourceText.length.toLocaleString()}자 · 덱 제목: ${plan.deckTitle}`);
  console.log(`슬라이드 ${plan.slides.length}장\n`);

  for (const s of plan.slides) {
    const field = { cards: "cardsItems", timeline: "timelineItems", flow: "flowSteps", metrics: "metricsItems" }[s.visualType] as keyof typeof s;
    const filled = Array.isArray(s[field]) ? (s[field] as unknown[]).length : 0;
    const others = (["cardsItems", "timelineItems", "flowSteps", "metricsItems"] as const)
      .filter((f) => f !== field && s[f] != null);
    const leak = others.length ? `  ★ ${others.join(",")} 가 비어있지 않음` : "";
    console.log(`  ${String(s.number).padStart(2)} ${s.visualType.padEnd(8)} ${filled}개  ${s.title}${leak}`);
    console.log(`     결론: ${s.conclusion}`);
    if (s.evidenceNote) console.log(`     근거: ${s.evidenceNote}`);
  }
} catch (err) {
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.error(`실패 · ${secs}초 · 입력 ${sourceText.length.toLocaleString()}자`);
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

void main();
