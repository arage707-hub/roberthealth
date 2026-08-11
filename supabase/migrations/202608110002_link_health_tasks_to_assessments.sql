-- Tie each personalized task plan to the assessment that generated it.
alter table public.health_tasks
  add column if not exists assessment_id uuid references public.assessments(id) on delete cascade;

create index if not exists health_tasks_assessment_id_idx
  on public.health_tasks(assessment_id);

