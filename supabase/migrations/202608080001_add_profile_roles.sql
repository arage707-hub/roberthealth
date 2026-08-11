-- Application roles belong on public.profiles. Supabase owns auth.users.
update public.profiles
set role = 'member'
where role = 'user' or role is null;

alter table public.profiles
  alter column role set default 'member',
  alter column role set not null;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'admin'));
