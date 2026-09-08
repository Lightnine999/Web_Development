import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { GenerateForm } from "./generate-form";
import { DeckDeleteButton } from "./deck-delete-button";

type DeckRow = {
  id: string;
  company_name: string;
  storage_path: string;
  created_at: string;
};

async function loadDecks() {
  const supabase = await createClient();
  const { data: decks } = await supabase
    .from("decks")
    .select("id, company_name, storage_path, created_at")
    .order("created_at", { ascending: false })
    .returns<DeckRow[]>();

  if (!decks || decks.length === 0) return [];

  return Promise.all(
    decks.map(async (deck) => {
      const { data } = await supabase.storage
        .from("decks")
        .createSignedUrl(deck.storage_path, 60 * 60);
      return { ...deck, downloadUrl: data?.signedUrl ?? null };
    }),
  );
}

export default async function HomePage() {
  const decks = await loadDecks();

  return (
    <main className="mx-auto w-full max-w-(--container-work) px-7 py-10">
      <div className="flex items-center justify-between border-b border-rule pb-4">
        <h1 className="text-title font-semibold tracking-[-0.015em]">
          IR 자료 만들기
        </h1>
        <form action={signOut}>
          <button type="submit" className="text-small text-ink-muted underline">
            로그아웃
          </button>
        </form>
      </div>

      <section className="mt-9 max-w-[760px]">
        <h2 className="text-section font-semibold">무엇으로 만들까요</h2>
        <p className="mt-2 max-w-(--container-read) text-body text-ink-muted">
          회사를 설명하는 자료가 있으면 됩니다. 자료가 구체적일수록 추정이
          줄어듭니다.
        </p>
        <div className="mt-7">
          <GenerateForm />
        </div>
      </section>

      {decks.length > 0 && (
        <section className="mt-12">
          <h2 className="border-b border-ink pb-3 text-note font-semibold">
            생성 이력
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {decks.map((deck) => (
              <li
                key={deck.id}
                className="flex items-center justify-between border-b border-rule-soft py-3"
              >
                <div>
                  <Link
                    href={`/decks/${deck.id}`}
                    className="text-body text-ink no-underline hover:underline"
                  >
                    {deck.company_name}
                  </Link>
                  <p className="text-note text-ink-faint">
                    {new Date(deck.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {deck.downloadUrl ? (
                    <a href={deck.downloadUrl} className="text-small font-medium">
                      다운로드
                    </a>
                  ) : (
                    <span className="text-small text-ink-faint">만료됨</span>
                  )}
                  <DeckDeleteButton deckId={deck.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 하단 안내 — 이 도구가 무엇이고 무엇을 넣으면 되는지 세 가지로 */}
      <footer className="mt-16 border-t border-ink pt-8">
        <h2 className="text-note font-semibold">이 도구는</h2>
        <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-3">
          <div>
            <h3 className="text-body font-semibold">무엇을 넣나요</h3>
            <p className="mt-2 text-small leading-[1.6] text-ink-muted">
              실제 회사 자료도, 아직 구상 중인 사업도 됩니다. 연혁과 실적, 사업
              모델을 텍스트로 붙여넣거나 PDF로 올리세요.
            </p>
          </div>
          <div>
            <h3 className="text-body font-semibold">무엇이 나오나요</h3>
            <p className="mt-2 text-small leading-[1.6] text-ink-muted">
              발표에 바로 쓰는 <span className="tnum">12</span>장 PPTX입니다.
              성장 전환점, 사업 모델, 위험과 과제까지 IR 순서로 정리합니다.
            </p>
          </div>
          <div>
            <h3 className="text-body font-semibold">무엇을 지키나요</h3>
            <p className="mt-2 text-small leading-[1.6] text-ink-muted">
              자료에 없는 사실은 지어내지 않습니다. 확인된 것과 해석을 슬라이드에서
              구분하고, 근거가 없으면 없다고 적습니다.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
