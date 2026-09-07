import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf";
import { GenerateInputSchema, MAX_PDF_BYTES } from "@/lib/deck/schema";
import { generateSlidePlan } from "@/lib/deck/generate";
import { renderDeck } from "@/lib/deck/render";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  } catch {
    return errorResponse("AI_PROVIDER_ERROR", "자료 생성 중 오류가 발생했습니다", 502);
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
