-- Create table for notification preferences
create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  arthur_enabled boolean not null default false,
  windows text[] not null default ARRAY['09:00','17:00'],
  channels text[] not null default ARRAY['push'],
  quiet_hours jsonb not null default '{"start":"21:00","end":"07:00"}',
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.notification_prefs enable row level security;

-- Policies: owner can select/insert/update their row
create policy "prefs_select_own" on public.notification_prefs
for select using (auth.uid() = user_id);

create policy "prefs_upsert_own" on public.notification_prefs
for insert with check (auth.uid() = user_id);

create policy "prefs_update_own" on public.notification_prefs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Helpful updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

create trigger notification_prefs_set_updated_at
before update on public.notification_prefs
for each row execute function public.set_updated_at();