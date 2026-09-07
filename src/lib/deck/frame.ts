import type PptxGenJS from "pptxgenjs";
import { CONTENT, FONT, MARGIN_X, PAGE, SLIDE } from "./theme";
import type { Slide as SlideData } from "./schema";

/**
 * 12장 전부가 공유하는 프레임: 좌측 레일, kicker, 페이지 번호,
 * 제목, 구분선, 하단 결론 바. 본문은 blocks/*.ts가 CONTENT 영역에 그린다.
 */
export function drawFrame(slide: PptxGenJS.Slide, data: SlideData) {
  slide.background = { color: SLIDE.off };

  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 0.12,
    h: PAGE.h,
    fill: { color: SLIDE.navy },
    line: { color: SLIDE.navy, width: 0 },
  });

  slide.addText(data.kicker, {
    x: MARGIN_X,
    y: 0.4,
    w: PAGE.w - MARGIN_X * 2 - 1,
    h: 0.3,
    fontFace: FONT,
    fontSize: 12,
    color: SLIDE.muted,
    charSpacing: 1,
    bold: true,
  });

  slide.addText(`${String(data.number).padStart(2, "0")} / 12`, {
    x: PAGE.w - MARGIN_X - 1,
    y: 0.4,
    w: 1,
    h: 0.3,
    align: "right",
    fontFace: FONT,
    fontSize: 12,
    color: SLIDE.muted,
  });

  slide.addText(data.title, {
    x: MARGIN_X,
    y: 0.72,
    w: PAGE.w - MARGIN_X * 2,
    h: 0.9,
    fontFace: FONT,
    fontSize: 22,
    color: SLIDE.ink,
    bold: true,
    valign: "top",
    fit: "shrink",
    lineSpacingMultiple: 1.15,
  });

  slide.addShape("line", {
    x: MARGIN_X,
    y: 1.72,
    w: PAGE.w - MARGIN_X * 2,
    h: 0,
    line: { color: SLIDE.line, width: 1 },
  });

  const conclusionY = CONTENT.y + CONTENT.h + 0.15;

  slide.addShape("roundRect", {
    x: MARGIN_X,
    y: conclusionY,
    w: PAGE.w - MARGIN_X * 2,
    h: 0.55,
    rectRadius: 0.06,
    fill: { color: SLIDE.navy },
    line: { color: SLIDE.navy, width: 0 },
  });

  slide.addText(data.conclusion, {
    x: MARGIN_X + 0.2,
    y: conclusionY,
    w: PAGE.w - MARGIN_X * 2 - 0.4,
    h: 0.55,
    fontFace: FONT,
    fontSize: 13,
    color: SLIDE.white,
    valign: "middle",
    fit: "shrink",
  });
}
