"use client";

import { useEffect, useState } from "react";

/**
 * 워커가 준비되기 전에 요청이 나가면 목을 통과해버린다.
 * App Router에는 ReactDOM.render 같은 단일 진입점이 없어서,
 * 이 컴포넌트가 워커 등록이 끝날 때까지 children을 붙잡는다.
 *
 * 목을 끄려면 .env.local에 NEXT_PUBLIC_API_MOCKING=disabled 를 넣는다.
 */
export function MockProvider({ children }: { children: React.ReactNode }) {
  const enabled =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_API_MOCKING !== "disabled";

  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      const { worker } = await import("./browser");
      await worker.start({
        // 목에 없는 요청(폰트, _next 정적 파일)은 조용히 통과시킨다
        onUnhandledRequest: "bypass",
        quiet: false,
      });
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!ready) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-dvh items-center justify-center text-small text-ink-faint"
      >
        목 서버를 켜고 있습니다
      </div>
    );
  }

  return children;
}
