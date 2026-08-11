-- The frontend may read its own role for UI gating. Laravel remains authoritative.
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

-- A signed-in user may repair a missing member profile, but can never create an admin profile.
drop policy if exists "Users can create own member profile" on public.profiles;
create policy "Users can create own member profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id and role = 'member');

-- Intentionally no client update/delete policies. Admin promotion is server/SQL only.
