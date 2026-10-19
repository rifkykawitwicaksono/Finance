-- Run in Supabase SQL Editor after replacing the two phone placeholders.
-- Use E.164 format, e.g. +6281234567890. Do not put phone allowlists in app JS.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.allowed_phone_numbers (
  phone text primary key check (phone ~ '^\\+[1-9][0-9]{7,14}$'),
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
revoke all on private.allowed_phone_numbers from public, anon, authenticated;
insert into private.allowed_phone_numbers(phone,label) values
  ('+62REPLACE_FIRST_NUMBER','Bubu'),
  ('+62REPLACE_SECOND_NUMBER','Dudu')
on conflict (phone) do update set label = excluded.label, active = true;

create table if not exists public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  display_name text not null,
  created_at timestamptz not null default now()
);
alter table public.app_members enable row level security;
revoke insert, update, delete on public.app_members from anon, authenticated;
grant select on public.app_members to authenticated;

create or replace function public.enforce_private_phone_allowlist()
returns trigger language plpgsql security definer set search_path = '' as $$
declare allowed_label text;
begin
  select a.label into allowed_label from private.allowed_phone_numbers a
  where a.phone = new.phone and a.active = true;
  if allowed_label is null then raise exception 'This app is private. This phone number is not allowlisted.'; end if;
  insert into public.app_members(user_id, phone, display_name)
  values(new.id, new.phone, allowed_label)
  on conflict(user_id) do update set phone = excluded.phone, display_name = excluded.display_name;
  return new;
end; $$;
revoke all on function public.enforce_private_phone_allowlist() from public, anon, authenticated;
drop trigger if exists enforce_private_phone_allowlist on auth.users;
create trigger enforce_private_phone_allowlist after insert or update of phone on auth.users
for each row execute function public.enforce_private_phone_allowlist();

create or replace function public.is_app_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.app_members m where m.user_id = auth.uid());
$$;
revoke all on function public.is_app_member() from public, anon;
grant execute on function public.is_app_member() to authenticated;
create policy "members can read member profiles" on public.app_members for select to authenticated using (public.is_app_member());

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.app_members(user_id) on delete cascade,
  body text,
  media_path text,
  media_type text not null default 'text' check(media_type in ('text','image','video','audio','location','file')),
  created_at timestamptz not null default now(),
  constraint message_has_content check (coalesce(length(trim(body)),0) > 0 or media_path is not null or media_type = 'location')
);
alter table public.messages enable row level security;
create policy "members can read messages" on public.messages for select to authenticated using (public.is_app_member());
create policy "members can send as themselves" on public.messages for insert to authenticated with check (public.is_app_member() and sender_id = auth.uid());
create index if not exists messages_created_at_idx on public.messages(created_at desc);

create table if not exists public.location_shares (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.app_members(user_id) on delete cascade,
  latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180),
  is_live boolean not null default false,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.location_shares enable row level security;
create policy "members can read unexpired locations" on public.location_shares for select to authenticated using (public.is_app_member() and expires_at > now());
create policy "members can create own location" on public.location_shares for insert to authenticated with check (public.is_app_member() and sender_id = auth.uid());
create policy "members can update own location" on public.location_shares for update to authenticated using (public.is_app_member() and sender_id = auth.uid()) with check (sender_id = auth.uid());

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.app_members(user_id) on delete cascade,
  callee_id uuid not null references public.app_members(user_id) on delete cascade,
  call_type text not null check(call_type in ('audio','video')),
  status text not null default 'ringing' check(status in ('ringing','accepted','declined','ended','missed')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
alter table public.calls enable row level security;
create policy "participants can read calls" on public.calls for select to authenticated using (public.is_app_member() and auth.uid() in (caller_id,callee_id));
create policy "members can start own calls" on public.calls for insert to authenticated with check (public.is_app_member() and caller_id = auth.uid() and callee_id <> auth.uid());
create policy "participants can update calls" on public.calls for update to authenticated using (public.is_app_member() and auth.uid() in (caller_id,callee_id)) with check (auth.uid() in (caller_id,callee_id));

create table if not exists public.call_signals (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.calls(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.app_members(user_id) on delete cascade,
  signal_type text not null check(signal_type in ('offer','answer','candidate','hangup')),
  payload jsonb,
  created_at timestamptz not null default now()
);
alter table public.call_signals enable row level security;
create policy "call participants can read signals" on public.call_signals for select to authenticated using (public.is_app_member() and exists(select 1 from public.calls c where c.id = call_id and auth.uid() in (c.caller_id,c.callee_id)));
create policy "call participants can send signals" on public.call_signals for insert to authenticated with check (public.is_app_member() and sender_id = auth.uid() and exists(select 1 from public.calls c where c.id = call_id and auth.uid() in (c.caller_id,c.callee_id)));

create table if not exists public.game_events (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references public.app_members(user_id) on delete cascade,
  game_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.game_events enable row level security;
create policy "members can read game events" on public.game_events for select to authenticated using (public.is_app_member());
create policy "members can send own game events" on public.game_events for insert to authenticated with check (public.is_app_member() and sender_id = auth.uid());

-- Private media bucket. Files are stored under {auth.uid()}/... and are not public.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('private-media','private-media',false,104857600,array['image/jpeg','image/png','image/webp','video/mp4','audio/m4a','audio/mp4','audio/aac','audio/mpeg','audio/webm'])
on conflict(id) do update set public=false;
create policy "members can read private media" on storage.objects for select to authenticated
using (bucket_id='private-media' and public.is_app_member());
create policy "members upload to own folder" on storage.objects for insert to authenticated
with check (bucket_id='private-media' and public.is_app_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "members can delete own media" on storage.objects for delete to authenticated
using (bucket_id='private-media' and public.is_app_member() and (storage.foldername(name))[1] = auth.uid()::text);

-- Enable realtime for tables used by subscriptions in Database > Publications if not enabled already.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.call_signals;
alter publication supabase_realtime add table public.game_events;
