/**
 * 슬라이드 전용 팔레트. 웹 UI 토큰(docs/DESIGN.md)과는 별도다 —
 * 지면 안쪽은 AGENTS.md §9가 정한 네이비·그린·옐로·오프화이트를 쓴다.
 */
export const SLIDE = {
  navy: "0B2239",
  navy2: "14344F",
  green: "2ECF76",
  greenDark: "177D4D",
  yellow: "FFC83D",
  off: "F5F6F1",
  white: "FFFFFF",
  ink: "12212D",
  muted: "687783",
  line: "D7DDD8",
} as const;

export const FONT = "Pretendard";

export const PAGE = { w: 10, h: 5.625 };

export const MARGIN_X = 0.5;

/** 프레임이 차지하는 영역을 뺀 나머지 = 본문 블록이 쓸 수 있는 영역. */
export const CONTENT = { x: MARGIN_X, y: 1.9, w: PAGE.w - MARGIN_X * 2, h: 2.55 };
