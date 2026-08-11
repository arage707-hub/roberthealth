-- Personalized daily/weekly pathway tasks and score boosts.
alter table public.assessments add column if not exists base_health_percentage integer check (base_health_percentage between 0 and 100);
alter table public.assessments add column if not exists base_nutrition_percentage integer check (base_nutrition_percentage between 0 and 100);
alter table public.assessments add column if not exists base_toxin_percentage integer check (base_toxin_percentage between 0 and 100);
alter table public.assessments add column if not exists base_mental_percentage integer check (base_mental_percentage between 0 and 100);
alter table public.assessments add column if not exists base_physical_percentage integer check (base_physical_percentage between 0 and 100);
alter table public.assessments add column if not exists base_genetic_percentage integer check (base_genetic_percentage between 0 and 100);
alter table public.assessments add column if not exists base_medical_percentage integer check (base_medical_percentage between 0 and 100);

update public.assessments set
  base_health_percentage = coalesce(base_health_percentage, health_percentage),
  base_nutrition_percentage = coalesce(base_nutrition_percentage, nutrition_percentage),
  base_toxin_percentage = coalesce(base_toxin_percentage, toxin_percentage),
  base_mental_percentage = coalesce(base_mental_percentage, mental_percentage),
  base_physical_percentage = coalesce(base_physical_percentage, physical_percentage),
  base_genetic_percentage = coalesce(base_genetic_percentage, genetic_percentage),
  base_medical_percentage = coalesce(base_medical_percentage, medical_percentage);

create or replace function public.preserve_assessment_base_scores()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.base_health_percentage := coalesce(new.base_health_percentage, new.health_percentage);
  new.base_nutrition_percentage := coalesce(new.base_nutrition_percentage, new.nutrition_percentage);
  new.base_toxin_percentage := coalesce(new.base_toxin_percentage, new.toxin_percentage);
  new.base_mental_percentage := coalesce(new.base_mental_percentage, new.mental_percentage);
  new.base_physical_percentage := coalesce(new.base_physical_percentage, new.physical_percentage);
  new.base_genetic_percentage := coalesce(new.base_genetic_percentage, new.genetic_percentage);
  new.base_medical_percentage := coalesce(new.base_medical_percentage, new.medical_percentage);
  return new;
end;
$$;

drop trigger if exists preserve_assessment_base_scores on public.assessments;
create trigger preserve_assessment_base_scores
before insert on public.assessments
for each row execute function public.preserve_assessment_base_scores();

create table if not exists public.health_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('Nutrition', 'Toxin', 'Mental', 'Physical', 'Genetic', 'Medical')),
  title text not null,
  description text,
  impact_level text not null check (impact_level in ('high', 'medium', 'low')),
  frequency text not null check (frequency in ('daily', 'weekly')),
  points_value integer not null check (points_value > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists health_tasks_user_active_category_idx
  on public.health_tasks(user_id, is_active, category);

alter table public.health_tasks enable row level security;
drop policy if exists "Users can read own health tasks" on public.health_tasks;
create policy "Users can read own health tasks"
on public.health_tasks for select to authenticated
using (auth.uid() = user_id);

-- No client write policies. Laravel writes with the server-only service role.
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.health_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  period_key text not null,
  unique (task_id, period_key)
);

create index if not exists task_completions_user_completed_at_idx
  on public.task_completions(user_id, completed_at desc);

alter table public.task_completions enable row level security;
drop policy if exists "Users can read own task completions" on public.task_completions;
create policy "Users can read own task completions"
on public.task_completions for select to authenticated
using (auth.uid() = user_id);

-- No client write policies. Laravel writes with the server-only service role.
