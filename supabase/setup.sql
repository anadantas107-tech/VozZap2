-- =========================================================
-- VozZap Supabase Setup
-- Execute este script primeiro no SQL Editor do Supabase
-- =========================================================

-- Habilitar extensões necessárias
create extension if not exists "uuid-ossp";

-- =========================================================
-- 1) Tabela de perfis
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- =========================================================
-- 2) Tabela de posts
-- =========================================================
create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Outros',
  audio_url text,
  cover_url text,
  duration integer default 0,
  visibility text not null default 'public',
  likes_count integer default 0,
  comments_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.posts enable row level security;

drop policy if exists "Anyone can view public posts" on public.posts;
create policy "Anyone can view public posts"
  on public.posts for select
  using (visibility = 'public');

drop policy if exists "Users can view their own posts" on public.posts;
create policy "Users can view their own posts"
  on public.posts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own posts" on public.posts;
create policy "Users can insert their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- =========================================================
-- 3) Tabela de comentários
-- =========================================================
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;

drop policy if exists "Anyone can view comments" on public.comments;
create policy "Anyone can view comments"
  on public.comments for select
  using (true);

drop policy if exists "Users can insert comments" on public.comments;
create policy "Users can insert comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- =========================================================
-- 4) Tabela de mensagens diretas
-- =========================================================
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

-- =========================================================
-- 5) Trigger para criar perfil automaticamente
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
