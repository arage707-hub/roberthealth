-- AI product recommendations, generated per assessment and pathway alongside the health choices.
create table if not exists public.product_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  category text not null check (category in ('Nutrition', 'Toxin', 'Mental', 'Physical', 'Genetic', 'Medical')),
  reason text not null,
  supports_task text,
  rank integer not null default 1 check (rank >= 1),
  created_at timestamptz not null default now(),
  unique (assessment_id, category, product_id)
);

create index if not exists product_recommendations_user_assessment_idx
  on public.product_recommendations(user_id, assessment_id, category, rank);

alter table public.product_recommendations enable row level security;

-- No client policies. Laravel reads and writes with the server-only service role.
