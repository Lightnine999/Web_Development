import { SLIDE } from "@/lib/deck/theme";
import type { Slide } from "@/lib/deck/schema";

/**
 * PPTX 안의 4가지 시각 유형(cards/timeline/flow/metrics)을 웹에서 그대로
 * 재구성한다. 슬라이드 "지면" 안쪽이므로 웹 UI 토큰이 아니라 이 프로젝트의
 * 슬라이드 팔레트(SLIDE, theme.ts)를 쓴다 — docs/DESIGN.md §1.
 */

const hex = (v: string) => `#${v}`;

function CardsVisual({ items }: { items: NonNullable<Slide["cardsItems"]> }) {
  return (
    <div className="flex h-full gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex-1 overflow-hidden border"
          style={{ background: hex(SLIDE.white), borderColor: hex(SLIDE.line) }}
        >
          <div className="h-1.5" style={{ background: hex(SLIDE.green) }} />
          <div className="p-3">
            <p className="text-[11px] font-bold" style={{ color: hex(SLIDE.muted) }}>
              {item.label}
            </p>
            <p className="mt-2 text-[13px] leading-snug" style={{ color: hex(SLIDE.ink) }}>
              {item.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineVisual({ items }: { items: NonNullable<Slide["timelineItems"]> }) {
  return (
    <div className="relative flex h-full items-center">
      <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: hex(SLIDE.line) }} />
      <div className="relative flex w-full justify-between">
        {items.map((item) => (
          <div key={item.year} className="flex flex-1 flex-col items-center px-1 text-center">
            <p className="text-[13px] font-bold" style={{ color: hex(SLIDE.navy) }}>
              {item.year}
            </p>
            <span
              className="my-1.5 block h-2.5 w-2.5 rounded-full"
              style={{ background: hex(SLIDE.navy) }}
            />
            <p className="text-[11px] leading-snug" style={{ color: hex(SLIDE.ink) }}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowVisual({ steps }: { steps: NonNullable<Slide["flowSteps"]> }) {
  return (
    <div className="flex h-full items-center gap-2">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <div key={step.label} className="flex flex-1 items-center gap-2">
            <div
              className="flex-1 border p-3"
              style={{
                background: hex(last ? SLIDE.navy : SLIDE.white),
                borderColor: hex(SLIDE.line),
              }}
            >
              <p
                className="text-[11px] font-bold"
                style={{ color: hex(last ? SLIDE.yellow : SLIDE.green) }}
              >
                {step.label}
              </p>
              <p
                className="mt-1.5 text-[12px] leading-snug"
                style={{ color: hex(last ? SLIDE.white : SLIDE.ink) }}
              >
                {step.text}
              </p>
            </div>
            {!last && (
              <span className="text-lg" style={{ color: hex(SLIDE.muted) }} aria-hidden>
                ›
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MetricsVisual({ items }: { items: NonNullable<Slide["metricsItems"]> }) {
  return (
    <div className="flex h-full gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-1 flex-col items-center justify-center border"
          style={{ background: hex(SLIDE.white), borderColor: hex(SLIDE.line) }}
        >
          <p className="text-[28px] font-bold" style={{ color: hex(SLIDE.navy) }}>
            {item.value}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: hex(SLIDE.muted) }}>
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/** visualType에 맞는 시각화를 고른다. schema.ts의 superRefine이 채워짐을 보장한다. */
export function SlideVisual({ slide }: { slide: Slide }) {
  switch (slide.visualType) {
    case "cards":
      return <CardsVisual items={slide.cardsItems!} />;
    case "timeline":
      return <TimelineVisual items={slide.timelineItems!} />;
    case "flow":
      return <FlowVisual steps={slide.flowSteps!} />;
    case "metrics":
      return <MetricsVisual items={slide.metricsItems!} />;
  }
}
