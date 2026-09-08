import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SlidePlanSchema } from "@/lib/deck/schema";
import { DeckPreview } from "./deck-preview";

type DeckRow = {
  id: string;
  company_name: string;
  storage_path: string;
  created_at: string;
  plan_json: unknown;
};

/**
 * 결과 페이지. 생성이 끝나면 여기로 온다.
 *
 * 미리보기는 실제 PPTX 파일을 이미지로 렌더한 것이 아니라, 생성할 때 저장해둔
 * plan_json(SlidePlan)을 웹 컴포넌트로 다시 그린 것이다 — 내용은 같지만
 * 픽셀 단위로 PPTX와 동일하지는 않다. plan_json이 없는(이 컬럼 추가 이전에
 * 만들어진) 기존 덱은 자리표시자로 대체한다.
 */
export default async function DeckPage({
  params,
}: PageProps<"/decks/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS(decks_select_own)가 본인 소유 행만 돌려주므로 별도 소유권 검사가 필요 없다.
  const { data: deck } = await supabase
    .from("decks")
    .select("id, company_name, storage_path, created_at, plan_json")
    .eq("id", id)
    .maybeSingle<DeckRow>();

  if (!deck) notFound();

  const parsedPlan = SlidePlanSchema.safeParse(deck.plan_json);
  const isPdf = deck.storage_path.toLowerCase().endsWith(".pdf");

  const { data: signed } = await supabase.storage
    .from("decks")
    .createSignedUrl(deck.storage_path, 60 * 60);

  const made = new Date(deck.created_at).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex h-14 items-center justify-between border-b border-rule bg-surface px-7">
        <div className="flex items-center gap-3.5">
          <span className="text-body font-semibold tracking-[-0.01em]">
            IR 자료 만들기
          </span>
          <span className="h-3.5 w-px bg-rule" aria-hidden />
          <Link href="/" className="text-small text-ink-muted no-underline hover:underline">
            내 자료로
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-note text-ink-faint tnum">{made} 만듦</span>
          {signed?.signedUrl ? (
            <a
              href={signed.signedUrl}
              className="flex h-9 items-center bg-seal px-5 text-small font-medium text-surface no-underline hover:bg-seal-deep hover:no-underline"
            >
              {isPdf ? "PDF 다운로드" : "PPTX 다운로드"}
            </a>
          ) : (
            <span className="text-small text-ink-faint">링크가 만료됐습니다</span>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-(--container-work) px-7 py-9">
        <h1 className="text-title font-semibold tracking-[-0.015em]">
          {deck.company_name} IR 자료
        </h1>
        {parsedPlan.success && (
          <p className="mt-1.5 text-small text-ink-muted">
            <span className="tnum">{parsedPlan.data.slides.length}</span>장
          </p>
        )}

        <div className="mt-8">
          {parsedPlan.success ? (
            <DeckPreview plan={parsedPlan.data} />
          ) : (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
              {/* 미리보기 자리 — plan_json이 없는(이전에 만든) 덱은 여기로 대체된다 */}
              <div>
                <div className="mb-2.5 text-note text-ink-faint">미리보기</div>
                <div className="flex aspect-video flex-col items-center justify-center border border-rule bg-surface px-8 text-center">
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    className="mb-4 text-ink-faint"
                    aria-hidden
                  >
                    <rect x="2.5" y="4.5" width="19" height="15" />
                    <path d="M2.5 16 L8 11 L12 14.5 L16 10 L21.5 15" />
                  </svg>
                  <p className="max-w-[36ch] text-body text-ink-muted">
                    이 자료는 미리보기 데이터 없이 만들어졌습니다
                  </p>
                  <p className="mt-2 max-w-[42ch] text-small text-ink-faint">
                    지금은 파일을 내려받아 확인해주세요. 새로 만드는 자료부터는
                    여기서 바로 볼 수 있습니다.
                  </p>
                </div>
              </div>

              <aside>
                <div className="mb-2.5 text-note text-ink-faint">
                  슬라이드 <span className="tnum">12</span>장
                </div>
                <ol className="border-t border-ink">
                  {[
                    "표지와 핵심 질문",
                    "핵심 요약",
                    "성장 전환점",
                    "인지도 누적 구조",
                    "브랜드 방어력",
                    "사업 모델",
                    "협업 전략",
                    "확장 증거",
                    "해외 진출",
                    "운영 모델",
                    "위험과 다음 과제",
                    "가치 전망",
                  ].map((title, i) => (
                    <li
                      key={title}
                      className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 border-b border-rule-soft py-2.5"
                    >
                      <span className="tnum pt-px text-note text-ink-faint">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-small">{title}</span>
                    </li>
                  ))}
                </ol>
              </aside>
            </div>
          )}
        </div>

        <div className="mt-9 flex items-center gap-3 border-t border-rule pt-6">
          <Link
            href="/"
            className="flex h-10 items-center border border-rule bg-surface px-4 text-small text-ink no-underline hover:border-ink hover:no-underline"
          >
            새로 만들기
          </Link>
          <span className="text-small text-ink-faint">
            다운로드 링크는 <span className="tnum">1</span>시간 뒤 만료됩니다. 이
            페이지를 새로 열면 다시 발급됩니다.
          </span>
        </div>
      </main>
    </div>
  );
}
