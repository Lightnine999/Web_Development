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
        <h1 className="text-title font-semibold">IR 자료 만들기</h1>
        <form action={signOut}>
          <button type="submit" className="text-small text-ink-muted underline">
            로그아웃
          </button>
        </form>
      </div>

      <section className="mt-8 max-w-(--container-read)">
        <GenerateForm />
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
                  <p className="text-body">{deck.company_name}</p>
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
    </main>
  );
}
