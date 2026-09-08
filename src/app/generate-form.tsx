"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_INPUT_TEXT_CHARS } from "@/lib/deck/schema";
import { describeError } from "@/lib/messages/errors";

type Mode = "text" | "pdf";

const MODES = [
  {
    id: "text" as const,
    title: "텍스트 붙여넣기",
    desc: `연혁, 실적, 사업 모델을 그대로 붙여넣으세요. 최대 ${MAX_INPUT_TEXT_CHARS.toLocaleString()}자.`,
  },
  {
    id: "pdf" as const,
    title: "PDF 올리기",
    desc: "회사소개서나 IR 자료를 그대로. 최대 10MB.",
  },
];

function ModeIcon({ mode, active }: { mode: Mode; active: boolean }) {
  const color = active ? "text-seal" : "text-ink-faint";
  return mode === "text" ? (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={color} aria-hidden>
      <path d="M4 4.5 H16" /><path d="M4 8.5 H16" /><path d="M4 12.5 H11" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={color} aria-hidden>
      <path d="M5 2.5 H12 L16 6.5 V17.5 H5 Z" /><path d="M12 2.5 V6.5 H16" />
    </svg>
  );
}

export function GenerateForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("text");
  const [companyName, setCompanyName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorCode(null);
    setPending(true);

    const formData = new FormData();
    formData.set("companyName", companyName);
    formData.set("sourceType", mode);
    if (mode === "pdf") {
      if (file) formData.set("file", file);
    } else {
      formData.set("sourceText", sourceText);
    }

    try {
      const res = await fetch("/api/generate", { method: "POST", body: formData });
      const body = await res.json();

      if (!res.ok) {
        setErrorCode(body.error?.code ?? null);
        setPending(false);
        return;
      }

      // 결과는 별도 페이지에서 본다. pending 을 풀지 않고 이동해 중복 제출을 막는다.
      router.push(`/decks/${body.deckId}`);
    } catch {
      setErrorCode("NETWORK");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <label className="flex max-w-[420px] flex-col gap-1.5">
        <span className="text-small text-ink-muted">회사명</span>
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          maxLength={60}
          disabled={pending}
          placeholder="예: 샘플웨이브"
          className="h-11 border border-rule bg-surface px-3 text-body outline-none placeholder:text-ink-faint focus-visible:border-focus disabled:opacity-60"
        />
      </label>

      {/* 입력 방식은 탭이 아니라 카드로 고른다. 무엇을 넣는 자리인지 카드 안에서 설명한다 */}
      <fieldset className="flex flex-col gap-2.5" disabled={pending}>
        <legend className="mb-1 text-note text-ink-faint">자료를 넣는 방법</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={active}
                className={`border bg-surface p-5 text-left disabled:opacity-60 ${
                  active
                    ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]"
                    : "border-rule hover:border-ink-faint"
                }`}
              >
                <span className="mb-2 flex items-center gap-2.5">
                  <ModeIcon mode={m.id} active={active} />
                  <span className="text-body font-semibold">{m.title}</span>
                </span>
                <span className="block text-small leading-[1.55] text-ink-muted">
                  {m.desc}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {mode === "text" ? (
        <label className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between">
            <span className="text-small text-ink-muted">회사 정보</span>
            <span className="tnum text-note text-ink-faint">
              {sourceText.length.toLocaleString()} /{" "}
              {MAX_INPUT_TEXT_CHARS.toLocaleString()}
            </span>
          </span>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            required
            maxLength={MAX_INPUT_TEXT_CHARS}
            rows={12}
            disabled={pending}
            placeholder="회사 연혁, 실적, 사업 모델 등을 붙여넣으세요."
            className="border border-rule bg-surface p-3 text-body leading-[1.65] outline-none placeholder:text-ink-faint focus-visible:border-focus disabled:opacity-60"
          />
          <span className="text-note leading-[1.55] text-ink-faint">
            연혁과 수치를 함께 적으면 성장 전환점을 더 정확히 찾습니다.
          </span>
        </label>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-small text-ink-muted">PDF 파일</span>
          <input
            type="file"
            accept="application/pdf"
            required
            disabled={pending}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="border border-rule bg-surface p-2.5 text-small file:mr-3 file:border file:border-rule file:bg-paper file:px-3 file:py-1.5 file:text-small file:text-ink disabled:opacity-60"
          />
          {file && (
            <span className="tnum text-note text-ink-muted">
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB
            </span>
          )}
          <span className="text-note leading-[1.55] text-ink-faint">
            스캔한 이미지 PDF는 글자를 읽을 수 없습니다. 그때는 텍스트로 붙여넣어
            주세요.
          </span>
        </label>
      )}

      {errorCode && (
        <div role="alert" className="border-l-2 border-danger pl-3">
          <p className="text-small text-danger">{describeError(errorCode).message}</p>
          {describeError(errorCode).action && (
            <p className="mt-1 text-small text-ink-muted">
              {describeError(errorCode).action}
            </p>
          )}
        </div>
      )}

      {pending && (
        <p role="status" aria-live="polite" className="text-small text-ink-muted">
          이 컴퓨터의 Codex CLI가 자료를 만들고 있습니다. 창을 닫으면 중단됩니다.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule pt-6">
        <button
          type="submit"
          disabled={pending}
          className="h-11 bg-seal px-6 text-small font-medium text-surface hover:bg-seal-deep disabled:opacity-60"
        >
          {pending ? "만드는 중" : "12장 만들기"}
        </button>
        <span className="text-small text-ink-faint">
          보통 <span className="tnum">2</span>~<span className="tnum">3</span>분
          걸립니다
        </span>
      </div>
    </form>
  );
}
