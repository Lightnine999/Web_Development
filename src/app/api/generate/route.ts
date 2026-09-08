import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf";
import { GenerateInputSchema, MAX_PDF_BYTES } from "@/lib/deck/schema";
import { CodexError } from "@/lib/deck/generate";
import { generateSlidePlan } from "@/lib/deck/generate-client";
import { renderDeck } from "@/lib/deck/render";

// generateSlidePlan(generate-client.ts)은 이제 로컬 codex를 직접 spawn하지 않고
// BACKEND_URL(기본 http://localhost:8787)의 backend/server.ts에 HTTP로 요청한다.
// 그 서버가 실제 Codex CLI를 서브프로세스로 호출하므로, backend/server.ts가
// codex 바이너리가 설치·로그인된 컴퓨터에서 떠 있어야 생성이 된다.
export const runtime = "nodejs";
export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function resolveSourceText(formData: FormData): Promise<string | { error: NextResponse }> {
  const sourceType = String(formData.get("sourceType") ?? "text");

  if (sourceType === "pdf") {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { error: errorResponse("VALIDATION_FAILED", "PDF 파일이 없습니다", 400) };
    }
    if (file.size > MAX_PDF_BYTES) {
      return { error: errorResponse("FILE_TOO_LARGE", "PDF는 10MB를 넘을 수 없습니다", 400) };
    }
    if (file.type !== "application/pdf") {
      return { error: errorResponse("FILE_TYPE_UNSUPPORTED", "PDF 파일만 지원합니다", 400) };
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const text = await extractPdfText(bytes);
      if (!text) {
        return { error: errorResponse("PARSE_FAILED", "PDF에서 텍스트를 읽지 못했습니다", 422) };
      }
      return text;
    } catch {
      return { error: errorResponse("PARSE_FAILED", "PDF를 읽는 중 오류가 발생했습니다", 422) };
    }
  }

  return String(formData.get("sourceText") ?? "");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("UNAUTHORIZED", "로그인이 필요합니다", 401);
  }

  const formData = await request.formData();
  const companyName = String(formData.get("companyName") ?? "");

  const sourceTextResult = await resolveSourceText(formData);
  if (typeof sourceTextResult !== "string") {
    return sourceTextResult.error;
  }

  const parsedInput = GenerateInputSchema.safeParse({
    companyName,
    sourceText: sourceTextResult,
  });
  if (!parsedInput.success) {
    return errorResponse(
      "VALIDATION_FAILED",
      parsedInput.error.issues[0]?.message ?? "입력값을 확인하세요",
      400,
    );
  }

  let pptxBuffer: Buffer;
  try {
    const slidePlan = await generateSlidePlan(
      parsedInput.data.companyName,
      parsedInput.data.sourceText,
    );
    pptxBuffer = await renderDeck(slidePlan);
  } catch (err) {
    // Codex 실패는 종류마다 사용자가 할 수 있는 조치가 다르다.
    // 코드를 그대로 넘겨 화면이 알맞은 안내를 고르게 한다.
    if (err instanceof CodexError) {
      const status = err.code === "CODEX_TIMEOUT" ? 504 : 502;
      console.error("[generate]", err.message);
      return errorResponse(err.code, "자료 생성에 실패했습니다", status);
    }
    console.error("[generate]", err);
    return errorResponse("CODEX_FAILED", "자료 생성에 실패했습니다", 502);
  }

  const deckId = crypto.randomUUID();
  const storagePath = `${user.id}/${deckId}.pptx`;

  const { error: uploadError } = await supabase.storage
    .from("decks")
    .upload(storagePath, pptxBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
  if (uploadError) {
    return errorResponse("STORAGE_UNAVAILABLE", "파일 저장에 실패했습니다", 502);
  }

  const { error: insertError } = await supabase.from("decks").insert({
    id: deckId,
    user_id: user.id,
    company_name: parsedInput.data.companyName,
    storage_path: storagePath,
  });
  if (insertError) {
    return errorResponse("STORAGE_UNAVAILABLE", "생성 기록 저장에 실패했습니다", 502);
  }

  const { data: signedUrl } = await supabase.storage
    .from("decks")
    .createSignedUrl(storagePath, 60 * 60);

  return NextResponse.json({ deckId, downloadUrl: signedUrl?.signedUrl ?? null });
}
