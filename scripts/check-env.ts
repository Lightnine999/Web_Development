/**
 * .env.local에 넣은 Supabase 키가 안전한 것인지 검사한다.
 * 키 값 자체는 절대 출력하지 않는다. 형식과 판정만 보여준다.
 *
 * 배경: 2026-09-08에 NEXT_PUBLIC_SUPABASE_ANON_KEY 자리에 service role급
 * sb_secret_ 키가 들어간 적이 있다. 이 값은 서버 쪽(src/lib/supabase/server.ts,
 * middleware.ts)에서 그대로 쓰이므로, 잘못 들어가면 RLS가 전부 우회된다.
 *
 * 실행:
 *   npm run check:env
 */

process.loadEnvFile(".env.local");

type Verdict = { name: string; safe: boolean; note: string };

function decodeJwtRole(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

function classifyKey(key: string): Verdict {
  if (key.startsWith("sb_publishable_")) {
    return { name: "publishable (새 이름의 anon)", safe: true, note: "브라우저에 노출돼도 되는 공개 키입니다." };
  }
  if (key.startsWith("sb_secret_")) {
    return {
      name: "secret (새 이름의 service role급)",
      safe: false,
      note: "이 키는 RLS를 우회합니다. NEXT_PUBLIC_SUPABASE_ANON_KEY 자리에 있으면 안 됩니다.",
    };
  }
  if (key.startsWith("eyJ")) {
    const role = decodeJwtRole(key);
    if (role === "anon") {
      return { name: "레거시 JWT anon", safe: true, note: "구형식 anon 키입니다." };
    }
    if (role === "service_role") {
      return {
        name: "레거시 JWT service_role",
        safe: false,
        note: "service_role 키가 anon 자리에 들어가 있습니다. RLS가 전부 우회됩니다.",
      };
    }
    return { name: `레거시 JWT (role=${role ?? "확인 불가"})`, safe: false, note: "알 수 없는 role입니다. 직접 확인하세요." };
  }
  return { name: "알 수 없는 형식", safe: false, note: "Supabase가 발급하는 키 형식이 아닙니다." };
}

function main(): number {
  let problems = 0;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!url) {
    console.log("  ❌ NEXT_PUBLIC_SUPABASE_URL 이 비어 있습니다.");
    problems++;
  } else if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
    console.log(`  ⚠️  NEXT_PUBLIC_SUPABASE_URL 형식이 이상합니다: ${url}`);
    problems++;
  } else {
    console.log(`  ✅ NEXT_PUBLIC_SUPABASE_URL : ${url}`);
  }

  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!key) {
    console.log("  ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY 가 비어 있습니다.");
    problems++;
  } else {
    const { name, safe, note } = classifyKey(key);
    console.log(`  ${safe ? "✅" : "❌"} NEXT_PUBLIC_SUPABASE_ANON_KEY : ${name} · 길이 ${key.length}자`);
    console.log(`       ${note}`);
    if (!safe) problems++;
  }

  for (const name of Object.keys(process.env)) {
    if (name.toUpperCase().includes("SERVICE_ROLE")) {
      console.log(`  ❌ ${name} 이 환경에 있습니다. 이 앱은 서비스 롤 키를 쓰지 않으므로 제거하세요.`);
      problems++;
    }
  }

  console.log();
  console.log(problems ? `문제 ${problems}건. 위 항목을 고친 뒤 다시 실행하세요.` : "키 설정이 안전합니다.");
  return problems ? 1 : 0;
}

process.exit(main());
