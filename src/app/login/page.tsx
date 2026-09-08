"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthActionState } from "./actions";

const initialState: AuthActionState = { error: null };

/** 근거 등급 — docs/DESIGN.md 의 방주 색단. 가입 전에 제품의 성격을 먼저 보여준다 */
const GRADES = [
  { label: "사실", cls: "marg-fact", text: "자료에 직접 적혀 있는 수치와 사건" },
  { label: "해석", cls: "", text: "여러 자료를 이어 붙인 분석" },
  { label: "추정", cls: "", text: "가정이 들어간 전망. 사선으로 표시" },
  { label: "[ ]", cls: "marg-missing", text: "확인할 자료가 없는 항목" },
] as const;

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      {/* 왼쪽: 이 제품이 무엇을 해주는지. 모바일에서는 폼 아래로 내린다 */}
      <section className="order-2 flex flex-col border-t border-rule px-7 py-12 lg:order-1 lg:border-r lg:border-t-0 lg:px-14 lg:py-16">
        <span className="text-body font-semibold tracking-[-0.01em]">
          IR 자료 만들기
        </span>

        <h1 className="mt-12 max-w-[22ch] text-title font-semibold tracking-[-0.02em] lg:mt-14 lg:text-figure lg:leading-[1.25]">
          회사 자료를 넣으면 근거가 붙은 IR 12장이 나옵니다
        </h1>
        <p className="mt-4 max-w-(--container-read) text-body text-ink-muted">
          없는 사실을 지어내지 않습니다. 자료에서 확인된 것과 분석이 붙은 해석을
          슬라이드에서 구분해 표시합니다.
        </p>

        <div className="marginalia mt-11 max-w-[46ch]">
          {GRADES.map((g, i) => (
            <div key={g.label} className="contents">
              <div className={`marg ${g.cls}`}>{g.label}</div>
              <div
                className={`py-3 text-body ${i < GRADES.length - 1 ? "border-b border-rule-soft" : ""}`}
              >
                {g.text}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-auto pt-10 text-note text-ink-faint">
          슬라이드는 이 컴퓨터의 Codex CLI가 만듭니다. 자료는 본인 계정에만 저장됩니다.
        </p>
      </section>

      {/* 오른쪽: 폼 */}
      <section className="order-1 flex items-center justify-center bg-surface px-7 py-14 lg:order-2 lg:px-14">
        <div className="w-full max-w-[360px]">
          <h2 className="text-section font-semibold">
            {mode === "signin" ? "로그인" : "가입하기"}
          </h2>
          <p className="mt-1.5 text-small text-ink-muted">
            {mode === "signin"
              ? "만든 자료는 계정에 남습니다."
              : "이메일과 비밀번호만 있으면 됩니다."}
          </p>

          <form action={formAction} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-small text-ink-muted">이메일</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                className="h-11 border border-rule bg-surface px-3 text-body outline-none placeholder:text-ink-faint focus-visible:border-focus"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-small text-ink-muted">비밀번호</span>
              <input
                name="password"
                type="password"
                required
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="h-11 border border-rule bg-surface px-3 text-body outline-none focus-visible:border-focus"
              />
              {mode === "signup" && (
                <span className="text-note text-ink-faint">8자 이상</span>
              )}
            </label>

            {state.error && (
              <div role="alert" className="border-l-2 border-danger pl-3">
                <p className="text-small text-danger">{state.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 h-11 bg-seal text-small font-medium text-surface hover:bg-seal-deep disabled:opacity-60"
            >
              {pending ? "처리 중..." : mode === "signin" ? "로그인" : "가입하기"}
            </button>
          </form>

          <div className="mt-7 flex items-baseline justify-between border-t border-rule-soft pt-5">
            <span className="text-small text-ink-muted">
              {mode === "signin" ? "계정이 없나요?" : "이미 계정이 있나요?"}
            </span>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="h-8 border border-rule bg-surface px-3 text-note text-ink hover:border-ink"
            >
              {mode === "signin" ? "가입하기" : "로그인"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
