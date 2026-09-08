import type PptxGenJS from "pptxgenjs";
import { CONTENT, FONT, SLIDE } from "../theme";
import type { Slide } from "../schema";

const GAP = 0.35;
const ARROW_W = 0.25;

/** 좌→우 단계 흐름 — 3~4단, 박스 사이를 화살표로 연결. visualType이 flow일 때만 호출된다. */
export function drawFlow(slide: PptxGenJS.Slide, data: Slide) {
  const steps = data.flowSteps!;
  const n = steps.length;
  const boxW = (CONTENT.w - GAP * (n - 1)) / n;
  const boxH = CONTENT.h * 0.75;
  const boxY = CONTENT.y + (CONTENT.h - boxH) / 2;

  steps.forEach((step, i) => {
    const x = CONTENT.x + i * (boxW + GAP);

    slide.addShape("roundRect", {
      x,
      y: boxY,
      w: boxW,
      h: boxH,
      rectRadius: 0.06,
      fill: { color: i === n - 1 ? SLIDE.navy : SLIDE.white },
      line: { color: SLIDE.line, width: 1 },
    });

    const onDark = i === n - 1;

    slide.addText(step.label, {
      x: x + 0.15,
      y: boxY + 0.18,
      w: boxW - 0.3,
      h: 0.35,
      fontFace: FONT,
      fontSize: 12,
      bold: true,
      color: onDark ? SLIDE.yellow : SLIDE.green,
      fit: "shrink",
    });

    slide.addText(step.text, {
      x: x + 0.15,
      y: boxY + 0.55,
      w: boxW - 0.3,
      h: boxH - 0.7,
      fontFace: FONT,
      fontSize: 12,
      color: onDark ? SLIDE.white : SLIDE.ink,
      valign: "top",
      fit: "shrink",
      lineSpacingMultiple: 1.3,
    });

    if (i < n - 1) {
      const arrowX = x + boxW + (GAP - ARROW_W) / 2;
      slide.addShape("chevron", {
        x: arrowX,
        y: boxY + boxH / 2 - 0.1,
        w: ARROW_W,
        h: 0.2,
        fill: { color: SLIDE.muted },
        line: { color: SLIDE.muted, width: 0 },
      });
    }
  });
}
