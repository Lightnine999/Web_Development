-- 예시 자료: 로그인한 누구나 볼 수 있게(읽기 전용) 지정된 덱을 공개한다.
-- 소유자만 삭제·수정 가능한 기존 정책은 그대로 둔다 — 예시는 읽기만 열어준다.
-- authenticated로 한정한다 — role을 지정하지 않으면 anon(로그인 없는 방문자)도
-- 포함돼버린다 (is_example=true 조건 자체가 auth.uid()를 안 쓰므로 막아주지 않는다).

alter table public.decks
  add column if not exists is_example boolean not null default false;

create policy "decks_select_examples" on public.decks
  for select to authenticated
  using (is_example = true);

create policy "decks_storage_select_examples" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'decks' and exists (
      select 1 from public.decks d
      where d.storage_path = storage.objects.name and d.is_example = true
    )
  );
