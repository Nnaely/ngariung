-- ============================================================
-- Ngariung — skema Supabase (produksi)
-- Jalankan sekali di Supabase SQL Editor.
-- Semua validasi lokasi & streak tetap dilakukan server (service role).
-- ============================================================

create extension if not exists "citext";
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. PROFIL
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text not null,
  username            citext unique not null,
  username_changed_at timestamptz not null default now(),
  avatar_emoji        text not null default '🔥',
  avatar_color        text not null default '#FF5A1F',
  notif_mode          text not null default 'not_checked_in'
                      check (notif_mode in ('all', 'not_checked_in', 'off')),
  role                text not null default 'member'
                      check (role in ('member', 'admin')),
  created_at          timestamptz not null default now(),
  constraint username_format
    check (username ~ '^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$')
);

-- ------------------------------------------------------------
-- 2. ABSEN
-- ------------------------------------------------------------
create table if not exists public.check_ins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  local_date    date not null,
  lat           double precision not null,
  lng           double precision not null,
  accuracy_m    double precision,
  distance_m    double precision not null,
  user_agent    text,
  unique (user_id, local_date)                      -- 1 absen / hari
);

create index if not exists check_ins_date_idx
  on public.check_ins (local_date, checked_in_at desc);

-- ------------------------------------------------------------
-- 3. STREAK
-- ------------------------------------------------------------
create table if not exists public.streaks (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  current      int not null default 0 check (current >= 0),
  longest      int not null default 0 check (longest >= 0),
  -- jatah freeze BULANAN (reset tiap tanggal 1). Sisa tidak diakumulasi.
  freezes      int not null default 2 check (freezes between 0 and 2),
  freeze_month text,                       -- "YYYY-MM" reset terakhir
  last_date    date,
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. PUSH SUBSCRIPTION
-- ------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text unique not null,
  p256dh     text not null,
  auth       text not null,
  platform   text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. LOG NOTIFIKASI (batching + audit)
-- ------------------------------------------------------------
create table if not exists public.notification_log (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  check_in_id  uuid references public.check_ins (id) on delete set null,
  payload      jsonb not null,
  status       text not null default 'queued'
               check (status in ('queued', 'sent', 'failed', 'skipped')),
  sent_at      timestamptz,
  clicked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists notification_log_recipient_idx
  on public.notification_log (recipient_id, created_at desc);

-- ------------------------------------------------------------
-- 6. RIWAYAT USERNAME (reservasi 30 hari)
-- ------------------------------------------------------------
create table if not exists public.username_history (
  username    citext primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  released_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. GERBANG DOMAIN (server-side, tidak bisa diakali client)
-- ------------------------------------------------------------
create or replace function public.enforce_polban_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) !~ '^[^@[:space:]]+@polban\.ac\.id$' then
    raise exception 'EMAIL_DOMAIN_NOT_ALLOWED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_domain on public.profiles;
create trigger trg_enforce_domain
  before insert or update of email on public.profiles
  for each row execute function public.enforce_polban_domain();

-- ------------------------------------------------------------
-- 8. RLS
-- ------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.check_ins           enable row level security;
alter table public.streaks             enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.notification_log    enable row level security;
alter table public.username_history    enable row level security;

-- profiles: baca baris sendiri, tulis baris sendiri
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- check_ins & streaks: HANYA service role yang menulis.
-- Tidak ada policy untuk authenticated -> tabel tertutup dari client.
-- Baca lewat view di bawah.

-- push_subscriptions: hanya milik sendiri
drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notification_log: hanya penerima
drop policy if exists notif_own on public.notification_log;
create policy notif_own on public.notification_log
  for select to authenticated using (recipient_id = auth.uid());

-- ------------------------------------------------------------
-- 9. VIEW PUBLIK (tanpa email, tanpa koordinat)
-- ------------------------------------------------------------
create or replace view public.members as
select id, username, avatar_emoji, avatar_color, created_at
from public.profiles;

create or replace view public.feed_view as
select
  c.id,
  c.checked_in_at,
  c.local_date,
  round(c.distance_m)::int as distance_m,
  p.id       as user_id,
  p.username,
  p.avatar_emoji,
  p.avatar_color
from public.check_ins c
join public.profiles p on p.id = c.user_id;

create or replace view public.leaderboard_view as
select
  p.id as user_id,
  p.username,
  p.avatar_emoji,
  p.avatar_color,
  coalesce(s.current, 0) as streak_current,
  coalesce(s.longest, 0) as streak_longest
from public.profiles p
left join public.streaks s on s.user_id = p.id;

grant select on public.members, public.feed_view, public.leaderboard_view
  to authenticated;

-- ------------------------------------------------------------
-- 10. CONTOH QUERY ABSEN (dipanggil dari Route Handler / RPC)
-- ------------------------------------------------------------
-- Insert check_in + update streak harus dalam satu transaksi.
-- Gunakan service role di server, JANGAN di client.

create or replace function public.record_check_in(
  p_user_id  uuid,
  p_lat      double precision,
  p_lng      double precision,
  p_accuracy double precision,
  p_distance double precision
)
returns public.streaks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today  date := (now() at time zone 'Asia/Jakarta')::date;
  v_month  text := to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM');
  v_streak public.streaks;
  v_gap    int;
  v_cur    int;
  v_freezes int;
begin
  if p_distance > 200 then
    raise exception 'OUT_OF_RANGE' using errcode = 'P0001';
  end if;
  if p_accuracy > 100 then
    raise exception 'LOW_ACCURACY' using errcode = 'P0001';
  end if;

  insert into public.check_ins
    (user_id, local_date, lat, lng, accuracy_m, distance_m)
  values
    (p_user_id, v_today, p_lat, p_lng, p_accuracy, p_distance);

  select * into v_streak from public.streaks where user_id = p_user_id for update;
  if not found then
    insert into public.streaks (user_id) values (p_user_id)
    returning * into v_streak;
  end if;

  -- jatah freeze bulanan: penuh lagi setiap awal bulan
  if v_streak.freeze_month is distinct from v_month then
    v_freezes := 2;
  else
    v_freezes := v_streak.freezes;
  end if;

  v_gap := v_today - coalesce(v_streak.last_date, v_today - 1);
  v_cur := v_streak.current;

  if v_gap = 1 then
    v_cur := v_cur + 1;
  elsif v_gap = 2 and v_freezes > 0 then
    v_cur := v_cur + 1;
    v_freezes := v_freezes - 1;
  else
    v_cur := 1;
  end if;

  update public.streaks set
    current      = v_cur,
    longest      = greatest(v_streak.longest, v_cur),
    freezes      = v_freezes,
    freeze_month = v_month,
    last_date    = v_today,
    updated_at   = now()
  where user_id = p_user_id
  returning * into v_streak;

  return v_streak;
end;
$$;

revoke all on function public.record_check_in(uuid, double precision, double precision, double precision, double precision)
  from anon, authenticated;
