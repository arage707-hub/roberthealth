create table if not exists public.user_login_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  login_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, login_date)
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_code text not null check (badge_code in ('starter','on_track','analyst','optimized','health_champion','ultimate')),
  earned_at timestamptz not null default now(),
  unique (user_id, badge_code)
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('badge_earned','assessment_completed','activities_ready')),
  title text not null,
  message text not null,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists user_notifications_user_created_idx on public.user_notifications(user_id, created_at desc);

alter table public.user_login_days enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_notifications enable row level security;

drop policy if exists "Users read own login days" on public.user_login_days;
create policy "Users read own login days" on public.user_login_days for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users read own badges" on public.user_badges;
create policy "Users read own badges" on public.user_badges for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users read own notifications" on public.user_notifications;
create policy "Users read own notifications" on public.user_notifications for select to authenticated using (auth.uid() = user_id);
-- Writes are performed only by Laravel using the service role.
