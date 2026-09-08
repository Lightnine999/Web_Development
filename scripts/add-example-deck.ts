/**
 * 참고용 예시 자료를 등록한다. is_example=true로 표시해 로그인한 누구나 볼 수 있게 한다
 * (supabase/migrations의 decks_select_examples·decks_storage_select_examples 정책).
 *
 * 업로드는 본인 계정으로 로그인해서 진행되므로(RLS의 decks_insert_own), 비밀번호를
 * 환경변수로 직접 넘긴다 — 이 값은 이 스크립트 프로세스 밖으로 나가지 않는다.
 *
 * 실행:
 *   EXAMPLE_EMAIL="you@example.com" EXAMPLE_PASSWORD="..." \
 *     npx tsx --env-file=.env.local scripts/add-example-deck.ts <파일 경로> "<목록에 표시할 이름>"
 */
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [filePath, companyName] = process.argv.slice(2);
  if (!filePath || !companyName) {
    console.error('사용법: tsx scripts/add-example-deck.ts <파일 경로> "<표시할 이름>"');
    process.exit(1);
  }

  const email = process.env.EXAMPLE_EMAIL;
  const password = process.env.EXAMPLE_PASSWORD;
  if (!email || !password) {
    console.error("EXAMPLE_EMAIL, EXAMPLE_PASSWORD 환경변수가 필요합니다.");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signIn.user) {
    console.error("로그인 실패:", signInError?.message);
    process.exit(1);
  }
  const userId = signIn.user.id;

  const bytes = await readFile(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase() || "pdf";
  const contentType = ext === "pdf" ? "application/pdf" : "application/octet-stream";
  const deckId = randomUUID();
  const storagePath = `${userId}/${deckId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("decks")
    .upload(storagePath, bytes, { contentType });
  if (uploadError) {
    console.error("업로드 실패:", uploadError.message);
    process.exit(1);
  }

  const { error: insertError } = await supabase.from("decks").insert({
    id: deckId,
    user_id: userId,
    company_name: companyName,
    storage_path: storagePath,
    is_example: true,
  });
  if (insertError) {
    console.error("행 생성 실패:", insertError.message);
    process.exit(1);
  }

  console.log(`완료: "${companyName}" → ${storagePath}`);
  await supabase.auth.signOut();
}

void main();
