"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteDeck(deckId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS(decks_select_own)가 본인 소유 행만 돌려주므로 별도 소유권 검사가 필요 없다.
  const { data: deck } = await supabase
    .from("decks")
    .select("storage_path")
    .eq("id", deckId)
    .maybeSingle<{ storage_path: string }>();
  if (!deck) return;

  await supabase.storage.from("decks").remove([deck.storage_path]);
  await supabase.from("decks").delete().eq("id", deckId);

  revalidatePath("/");
}
