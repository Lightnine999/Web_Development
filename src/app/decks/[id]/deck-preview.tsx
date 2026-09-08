"use client";

import { useState } from "react";
import { SLIDE } from "@/lib/deck/theme";
import type { SlidePlan } from "@/lib/deck/schema";
import { SlideVisual } from "./slide-visual";

const hex = (v: string) => `#${v}`;

/**
 * 결과 페이지의 미리보기 + 슬라이드 목록. plan_json(실제 생성된 SlidePlan)을
 * 그대로 받아 화면에서 다시 그린다 — PPTX 파일 자체를 이미지로 변환하는 것은
 * 아니라서 픽셀 단위로 같지는 않지만, 내용은 실제 생성 결과 그대로다.
 */
export function DeckPreview({ plan }: { plan: SlidePlan }) {
  const [current, setCurrent] = useState(0);
  const slide = plan.slides[current];

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div>
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="text-note text-ink-faint">미리보기</span>
          <span className="text-note text-ink-faint tnum">
            {current + 1} / {plan.slides.length}
          </span>
        </div>

        <div
          className="flex aspect-video flex-col overflow-hidden border border-rule px-8 py-7"
          style={{ background: hex(SLIDE.off) }}
        >
          <p className="text-[12px] font-bold tracking-[0.02em]" style={{ color: hex(SLIDE.green) }}>
            {slide.kicker}
          </p>
          <h2 className="mt-1 text-[20px] font-semibold leading-snug" style={{ color: hex(SLIDE.ink) }}>
            {slide.title}
          </h2>
          <p className="mt-1.5 text-[13px]" style={{ color: hex(SLIDE.muted) }}>
            {slide.conclusion}
          </p>
          <div className="mt-5 flex-1">
            <SlideVisual slide={slide} />
          </div>
          {slide.evidenceNote && (
            <p className="mt-3 text-[10px]" style={{ color: hex(SLIDE.muted) }}>
              {slide.evidenceNote}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrent((i) => Math.max(0, i - 1))}
            disabled={current === 0}
            className="h-9 border border-rule px-3 text-small text-ink disabled:opacity-40"
          >
            이전
          </button>
          <button
            type="button"
            onClick={() => setCurrent((i) => Math.min(plan.slides.length - 1, i + 1))}
            disabled={current === plan.slides.length - 1}
            className="h-9 border border-rule px-3 text-small text-ink disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>

      <aside>
        <div className="mb-2.5 text-note text-ink-faint">
          슬라이드 <span className="tnum">{plan.slides.length}</span>장
        </div>
        <ol className="border-t border-ink">
          {plan.slides.map((s, i) => (
            <li key={s.number} className="border-b border-rule-soft">
              <button
                type="button"
                onClick={() => setCurrent(i)}
                aria-current={i === current}
                className={`grid w-full grid-cols-[22px_minmax(0,1fr)] gap-2.5 py-2.5 text-left ${
                  i === current ? "text-ink" : "text-ink-muted"
                }`}
              >
                <span className="tnum pt-px text-note text-ink-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-small">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
