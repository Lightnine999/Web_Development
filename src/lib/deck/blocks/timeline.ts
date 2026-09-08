import type PptxGenJS from "pptxgenjs";
import { CONTENT, FONT, SLIDE } from "../theme";
import type { Slide } from "../schema";

const NODE_R = 0.09;
const LINE_Y_RATIO = 0.35;

/** 가로 타임라인 — 연도 노드 3~6개, 아래에 설명. visualType이 timeline일 때만 호출된다. */
export function drawTimeline(slide: PptxGenJS.Slide, data: Slide) {
  const items = data.timelineItems!;
  const n = items.length;
  const lineY = CONTENT.y + CONTENT.h * LINE_Y_RATIO;
  const slotW = CONTENT.w / n;

  slide.addShape("line", {
    x: CONTENT.x,
    y: lineY,
    w: CONTENT.w,
    h: 0,
    line: { color: SLIDE.line, width: 2 },
  });

  items.forEach((item, i) => {
    const cx = CONTENT.x + slotW * i + slotW / 2;

    slide.addShape("ellipse", {
      x: cx - NODE_R,
      y: lineY - NODE_R,
      w: NODE_R * 2,
      h: NODE_R * 2,
      fill: { color: SLIDE.navy },
      line: { color: SLIDE.off, width: 2 },
    });

    slide.addText(item.year, {
      x: cx - slotW / 2 + 0.05,
      y: lineY - 0.55,
      w: slotW - 0.1,
      h: 0.35,
      align: "center",
      fontFace: FONT,
      fontSize: 14,
      bold: true,
      color: SLIDE.navy,
    });

    slide.addText(item.text, {
      x: cx - slotW / 2 + 0.05,
      y: lineY + 0.2,
      w: slotW - 0.1,
      h: CONTENT.h - (lineY - CONTENT.y) - 0.2,
      align: "center",
      valign: "top",
      fontFace: FONT,
      fontSize: 12,
      color: SLIDE.ink,
      fit: "shrink",
      lineSpacingMultiple: 1.3,
    });
  });
}
