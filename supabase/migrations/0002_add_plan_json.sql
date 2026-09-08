-- 미리보기용 슬라이드 원본 데이터. PPTX 렌더 전 SlidePlan(JSON) 그대로 저장한다.
-- 기존 행은 null — 그 경우 프론트는 "미리보기 준비 안 됨" 문구로 대체 표시한다.

alter table public.decks
  add column if not exists plan_json jsonb;
