-- Create app_settings table to track manual security configurations
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  security_flags jsonb default '{}'::jsonb,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.app_settings enable row level security;

-- Admins can read and update settings
create policy "Admins can manage app settings"
on public.app_settings
for all
to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row if none exists
insert into public.app_settings (security_flags, updated_at)
values ('{"leaked_password_protection_enabled": false}'::jsonb, now())
on conflict do nothing;

-- Add trigger to update timestamp
create trigger set_updated_at
before update on public.app_settings
for each row
execute function public.update_updated_at();