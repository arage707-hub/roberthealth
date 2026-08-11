-- Reserve the highest achievement tier; its unlock condition will be added later.
alter table public.user_badges drop constraint if exists user_badges_badge_code_check;
alter table public.user_badges add constraint user_badges_badge_code_check
  check (badge_code in ('starter','on_track','analyst','optimized','health_champion','ultimate'));

