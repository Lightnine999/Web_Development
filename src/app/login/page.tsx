"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthActionState } from "./actions";

const initialState: AuthActionState = { error: null };

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-title font-semibold">IR 자료 만들기</h1>
      <p className="mt-2 text-body text-ink-muted">
        {mode === "signin" ? "로그인하고 계속하세요." : "이메일로 계정을 만드세요."}
      </p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-small text-ink-muted">이메일</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-11 border border-rule bg-surface px-3 text-body outline-none focus-visible:border-focus"
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
        </label>

        {state.error && (
          <p className="text-small text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 h-11 bg-seal text-small font-medium text-surface hover:bg-seal-deep disabled:opacity-60"
        >
          {pending ? "처리 중..." : mode === "signin" ? "로그인" : "가입하기"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-6 self-start text-small text-ink-muted underline underline-offset-2"
      >
        {mode === "signin" ? "계정이 없나요? 가입하기" : "이미 계정이 있나요? 로그인"}
      </button>
    </main>
  );
}
