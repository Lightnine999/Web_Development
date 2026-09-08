"use client";

import { deleteDeck } from "./decks/actions";

export function DeckDeleteButton({ deckId }: { deckId: string }) {
  return (
    <form
      action={deleteDeck.bind(null, deckId)}
      onSubmit={(e) => {
        if (!confirm("삭제하면 되돌릴 수 없습니다. 필요하면 삭제 전에 먼저 다운로드하세요.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-small text-ink-faint underline">
        삭제
      </button>
    </form>
  );
}
