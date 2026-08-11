-- Persistent progress for background health-task generation.
create table if not exists public.task_generation_pathways (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('Nutrition', 'Toxin', 'Mental', 'Physical', 'Genetic', 'Medical')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'complete', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, category)
);

create index if not exists task_generation_pathways_user_assessment_idx
  on public.task_generation_pathways(user_id, assessment_id);

alter table public.task_generation_pathways enable row level security;
-- No client policies: Laravel's service role owns generation state.