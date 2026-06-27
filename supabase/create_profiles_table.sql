-- Profiles table for VozZap
create table if not exists public.profiles (
  id uuid primary key,
  name text,
  email text unique,
  avatar_url text,
  bio text,
  followers_count integer default 0,
  following_count integer default 0,
  posts_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Allow authenticated users to select their own profile and public profiles
drop policy if exists "Anyone can view profiles" on public.profiles;
create policy "Anyone can view profiles"
  on public.profiles for select
  using (true);

-- Allow authenticated users to insert their own profile
drop policy if exists "Users can insert profiles" on public.profiles;
create policy "Users can insert profiles"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Allow users to update their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Allow users to delete their own profile
drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- Trigger to update updated_at
create or replace function public.profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.profiles_updated_at();
