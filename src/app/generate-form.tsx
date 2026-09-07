"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MAX_INPUT_TEXT_CHARS } from "@/lib/deck/schema";

type Mode = "text" | "pdf";

export function GenerateForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("text");
  const [companyName, setCompanyName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDownloadUrl(null);
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
        setError(body.error?.message ?? "생성에 실패했습니다");
        return;
      }

      setDownloadUrl(body.downloadUrl);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-small text-ink-muted">회사명</span>
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          maxLength={60}
          className="h-11 border border-rule bg-surface px-3 text-body outline-none focus-visible:border-focus"
        />
      </label>

      <div className="flex gap-2 border-b border-rule">
        {(["text", "pdf"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`h-10 px-4 text-small font-medium ${
              mode === m
                ? "border-b-2 border-seal text-ink"
                : "text-ink-muted"
            }`}
          >
            {m === "text" ? "텍스트 붙여넣기" : "PDF 업로드"}
          </button>
        ))}
      </div>

      {mode === "text" ? (
        <label className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-small text-ink-muted">회사 정보</span>
            <span className="text-note text-ink-faint tnum">
              {sourceText.length} / {MAX_INPUT_TEXT_CHARS}
            </span>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            required
            maxLength={MAX_INPUT_TEXT_CHARS}
            rows={10}
            className="border border-rule bg-surface p-3 text-body outline-none focus-visible:border-focus"
            placeholder="회사 연혁, 실적, 사업 모델 등을 붙여넣으세요."
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-small text-ink-muted">PDF 파일 (최대 10MB)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="border border-rule bg-surface p-2 text-small"
          />
        </label>
      )}

      {error && (
        <p className="text-small text-danger" role="alert">
          {error}
        </p>
      )}

      {downloadUrl && (
        <p className="text-small text-ok">
          생성이 끝났습니다.{" "}
          <a href={downloadUrl} className="underline">
            PPTX 다운로드
          </a>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-11 bg-seal text-small font-medium text-surface hover:bg-seal-deep disabled:opacity-60"
      >
        {pending ? "만드는 중... (1~2분 걸릴 수 있습니다)" : "12장 만들기"}
      </button>
    </form>
  );
}
