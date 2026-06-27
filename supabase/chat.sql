-- =========================================================
-- VozZap Chat SQL
-- Execute depois do setup.sql
-- =========================================================

-- Garantir que a tabela de mensagens existe
create table if not exists public.direct_messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  text text,
  audio_url text,
  audio_duration integer default 0,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.direct_messages enable row level security;

drop policy if exists "Users can view their own messages" on public.direct_messages;
create policy "Users can view their own messages"
  on public.direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can insert messages" on public.direct_messages;
create policy "Users can insert messages"
  on public.direct_messages for insert
  with check (auth.uid() = sender_id);

drop policy if exists "Users can update own received messages as read" on public.direct_messages;
create policy "Users can update own received messages as read"
  on public.direct_messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- Índice para consultas por conversa
create index if not exists idx_direct_messages_conversation
  on public.direct_messages (sender_id, receiver_id, created_at desc);
