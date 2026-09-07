import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 컴포넌트·라우트 핸들러에서 쓰는 Supabase 클라이언트.
 * 사용자 세션 쿠키로 인증하므로, 이후의 모든 DB/Storage 호출은
 * 서비스 롤 키 없이 RLS 정책 그대로 적용받는다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // 서버 컴포넌트 렌더링 중에는 쿠키를 쓸 수 없다.
          // middleware가 세션 갱신을 담당하므로 여기서는 실패를 무시한다.
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // no-op: middleware가 처리
          }
        },
      },
    },
  );
}
