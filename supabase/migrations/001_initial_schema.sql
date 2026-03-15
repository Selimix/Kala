-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase Auth users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  timezone text not null default 'Europe/Paris',
  morning_checkin_time time not null default '08:00',
  evening_checkin_time time not null default '20:00',
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Utilisateur'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- EVENTS
-- ============================================================
create type event_category as enum (
  'travail', 'personnel', 'sante', 'social',
  'sport', 'administratif', 'autre'
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  people text[],
  category event_category not null default 'autre',
  is_all_day boolean not null default false,
  recurrence_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_time_range check (end_time > start_time)
);

alter table public.events enable row level security;

create policy "Users can view their own events"
  on public.events for select
  using (auth.uid() = user_id);

create policy "Users can create their own events"
  on public.events for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own events"
  on public.events for update
  using (auth.uid() = user_id);

create policy "Users can delete their own events"
  on public.events for delete
  using (auth.uid() = user_id);

create index idx_events_user_time on public.events (user_id, start_time);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "Users can view their own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users can create their own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own conversations"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- ============================================================
-- MESSAGES
-- ============================================================
create type message_role as enum ('user', 'assistant');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role message_role not null,
  content text not null,
  tool_calls jsonb,
  tool_results jsonb,
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Users can view their own messages"
  on public.messages for select
  using (auth.uid() = user_id);

create policy "Users can create their own messages"
  on public.messages for insert
  with check (auth.uid() = user_id);

create index idx_messages_conversation on public.messages (conversation_id, created_at);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.events;
