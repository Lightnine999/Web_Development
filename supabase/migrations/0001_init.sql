-- 저장 테이블: 생성된 IR 데크 이력.
-- 서비스 롤 키를 쓰지 않으므로, 접근 제어는 전부 이 파일의 RLS 정책이 담당한다.

create table if not exists public.decks (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.decks enable row level security;

create policy "decks_select_own" on public.decks
  for select using (auth.uid() = user_id);

create policy "decks_insert_own" on public.decks
  for insert with check (auth.uid() = user_id);

create policy "decks_delete_own" on public.decks
  for delete using (auth.uid() = user_id);

-- Storage 버킷: 파일 경로가 항상 `${user_id}/${deck_id}.pptx` 형태이므로
-- 첫 폴더 세그먼트가 본인 user_id일 때만 접근을 허용한다.

insert into storage.buckets (id, name, public)
values ('decks', 'decks', false)
on conflict (id) do nothing;

create policy "decks_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'decks' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "decks_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'decks' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "decks_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'decks' and (storage.foldername(name))[1] = auth.uid()::text
  );
