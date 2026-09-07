import PptxGenJS from "pptxgenjs";
import { drawFrame } from "./frame";
import { drawCards } from "./blocks/cards";
import { drawTimeline } from "./blocks/timeline";
import { drawFlow } from "./blocks/flow";
import { drawMetrics } from "./blocks/metrics";
import type { SlidePlan } from "./schema";

/** Slide Plan JSON을 받아 12장 PPTX를 만들어 Buffer로 반환한다. */
export async function renderDeck(plan: SlidePlan): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.title = plan.deckTitle;

  for (const slideData of plan.slides) {
    const slide = pptx.addSlide();
    drawFrame(slide, slideData);

    switch (slideData.visualType) {
      case "cards":
        drawCards(slide, slideData);
        break;
      case "timeline":
        drawTimeline(slide, slideData);
        break;
      case "flow":
        drawFlow(slide, slideData);
        break;
      case "metrics":
        drawMetrics(slide, slideData);
        break;
    }

    if (slideData.evidenceNote) {
      slide.addNotes(slideData.evidenceNote);
    }
  }

  const arrayBuffer = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(arrayBuffer as ArrayBuffer);
}
