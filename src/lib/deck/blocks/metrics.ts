import type PptxGenJS from "pptxgenjs";
import { CONTENT, FONT, SLIDE } from "../theme";
import type { Slide } from "../schema";

const GAP = 0.3;

/** 큰 숫자 타일 2~4개. visualType이 metrics일 때만 호출된다. */
export function drawMetrics(slide: PptxGenJS.Slide, data: Slide) {
  const items = data.metricsItems!;
  const n = items.length;
  const tileW = (CONTENT.w - GAP * (n - 1)) / n;
  const tileH = CONTENT.h * 0.7;

  items.forEach((item, i) => {
    const x = CONTENT.x + i * (tileW + GAP);

    slide.addShape("rect", {
      x,
      y: CONTENT.y,
      w: tileW,
      h: tileH,
      fill: { color: SLIDE.white },
      line: { color: SLIDE.line, width: 1 },
    });

    slide.addText(item.value, {
      x: x + 0.1,
      y: CONTENT.y + 0.15,
      w: tileW - 0.2,
      h: tileH * 0.6,
      align: "center",
      valign: "middle",
      fontFace: FONT,
      fontSize: 32,
      bold: true,
      color: SLIDE.navy,
      fit: "shrink",
    });

    slide.addText(item.label, {
      x: x + 0.1,
      y: CONTENT.y + tileH * 0.65,
      w: tileW - 0.2,
      h: tileH * 0.3,
      align: "center",
      fontFace: FONT,
      fontSize: 12,
      color: SLIDE.muted,
      fit: "shrink",
    });
  });
}
