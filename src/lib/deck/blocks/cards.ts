import type PptxGenJS from "pptxgenjs";
import { CONTENT, FONT, SLIDE } from "../theme";
import type { Slide as SlideData } from "../schema";

type CardsSlide = Extract<SlideData, { visualType: "cards" }>;

const GAP = 0.2;

/** 카드 열 — 2~5개를 가로로 나란히. */
export function drawCards(slide: PptxGenJS.Slide, data: CardsSlide) {
  const n = data.items.length;
  const cardW = (CONTENT.w - GAP * (n - 1)) / n;

  data.items.forEach((item, i) => {
    const x = CONTENT.x + i * (cardW + GAP);

    slide.addShape("roundRect", {
      x,
      y: CONTENT.y,
      w: cardW,
      h: CONTENT.h,
      rectRadius: 0.05,
      fill: { color: SLIDE.white },
      line: { color: SLIDE.line, width: 1 },
    });

    slide.addShape("rect", {
      x,
      y: CONTENT.y,
      w: cardW,
      h: 0.06,
      fill: { color: SLIDE.green },
      line: { color: SLIDE.green, width: 0 },
    });

    slide.addText(item.label, {
      x: x + 0.15,
      y: CONTENT.y + 0.25,
      w: cardW - 0.3,
      h: 0.4,
      fontFace: FONT,
      fontSize: 12,
      bold: true,
      color: SLIDE.muted,
      fit: "shrink",
    });

    slide.addText(item.value, {
      x: x + 0.15,
      y: CONTENT.y + 0.65,
      w: cardW - 0.3,
      h: CONTENT.h - 0.85,
      fontFace: FONT,
      fontSize: 14,
      color: SLIDE.ink,
      valign: "top",
      fit: "shrink",
      lineSpacingMultiple: 1.3,
    });
  });
}
