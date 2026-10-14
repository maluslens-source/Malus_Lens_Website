-- Malus Lens website admin: content store, admin accounts, sessions, image bucket.
create extension if not exists pgcrypto with schema extensions;

-- Editable website content (one JSON document). Public read; writes only via the ml-admin edge function.
create table if not exists public.ml_site_content (
  id text primary key default 'site',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.ml_site_content enable row level security;
drop policy if exists ml_site_content_read on public.ml_site_content;
create policy ml_site_content_read on public.ml_site_content for select to anon, authenticated using (true);
insert into public.ml_site_content (id) values ('site') on conflict do nothing;

-- Admin accounts (bcrypt hashes) and sessions. No client access at all (RLS on, no policies).
create table if not exists public.ml_admins (
  username text primary key,
  pass_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.ml_admins enable row level security;

create table if not exists public.ml_admin_sessions (
  token text primary key,
  username text not null references public.ml_admins(username) on delete cascade,
  expires_at timestamptz not null
);
alter table public.ml_admin_sessions enable row level security;

-- Credential check used by the edge function (service role only).
create or replace function public.ml_admin_check(p_user text, p_pass text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select exists (select 1 from public.ml_admins a where lower(a.username) = lower(p_user) and a.pass_hash = extensions.crypt(p_pass, a.pass_hash));
$$;
revoke all on function public.ml_admin_check(text, text) from public, anon, authenticated;
grant execute on function public.ml_admin_check(text, text) to service_role;

-- Public bucket for website images uploaded from /admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ml-site', 'ml-site', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif','image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Create (or reset) an admin login — run separately, with your own password:
--   insert into public.ml_admins (username, pass_hash)
--   values ('Zayaan', extensions.crypt('<password>', extensions.gen_salt('bf', 10)))
--   on conflict (username) do update set pass_hash = excluded.pass_hash;
