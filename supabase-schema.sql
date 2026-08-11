-- Supabase schema for AI health assessment app

-- 1. Profiles table extends auth.users with additional user metadata
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists profiles_email_idx on profiles(id);

-- Upgrade databases created before member/admin roles were introduced.
update profiles set role = 'member' where role = 'user' or role is null;
alter table profiles alter column role set default 'member';
alter table profiles alter column role set not null;
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('member', 'admin'));

alter table profiles enable row level security;
drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile"
on profiles for select to authenticated
using (auth.uid() = id);
drop policy if exists "Users can create own member profile" on profiles;
create policy "Users can create own member profile"
on profiles for insert to authenticated
with check (auth.uid() = id and role = 'member');

-- 2. Assessments table to store completed assessment sessions
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending',
  score int null,
  health_percentage int null check (health_percentage between 0 and 100),
  nutrition_percentage int null check (nutrition_percentage between 0 and 100),
  toxin_percentage int null check (toxin_percentage between 0 and 100),
  mental_percentage int null check (mental_percentage between 0 and 100),
  physical_percentage int null check (physical_percentage between 0 and 100),
  genetic_percentage int null check (genetic_percentage between 0 and 100),
  medical_percentage int null check (medical_percentage between 0 and 100),
  notes text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists assessments_user_id_idx on assessments(user_id);

-- Keep this script safe to run against databases created from an earlier version.
alter table assessments add column if not exists health_percentage int null check (health_percentage between 0 and 100);
alter table assessments add column if not exists nutrition_percentage int null check (nutrition_percentage between 0 and 100);
alter table assessments add column if not exists toxin_percentage int null check (toxin_percentage between 0 and 100);
alter table assessments add column if not exists mental_percentage int null check (mental_percentage between 0 and 100);
alter table assessments add column if not exists physical_percentage int null check (physical_percentage between 0 and 100);
alter table assessments add column if not exists genetic_percentage int null check (genetic_percentage between 0 and 100);
alter table assessments add column if not exists medical_percentage int null check (medical_percentage between 0 and 100);
alter table assessments add column if not exists base_health_percentage int null check (base_health_percentage between 0 and 100);
alter table assessments add column if not exists base_nutrition_percentage int null check (base_nutrition_percentage between 0 and 100);
alter table assessments add column if not exists base_toxin_percentage int null check (base_toxin_percentage between 0 and 100);
alter table assessments add column if not exists base_mental_percentage int null check (base_mental_percentage between 0 and 100);
alter table assessments add column if not exists base_physical_percentage int null check (base_physical_percentage between 0 and 100);
alter table assessments add column if not exists base_genetic_percentage int null check (base_genetic_percentage between 0 and 100);
alter table assessments add column if not exists base_medical_percentage int null check (base_medical_percentage between 0 and 100);

update assessments set
  base_health_percentage = coalesce(base_health_percentage, health_percentage),
  base_nutrition_percentage = coalesce(base_nutrition_percentage, nutrition_percentage),
  base_toxin_percentage = coalesce(base_toxin_percentage, toxin_percentage),
  base_mental_percentage = coalesce(base_mental_percentage, mental_percentage),
  base_physical_percentage = coalesce(base_physical_percentage, physical_percentage),
  base_genetic_percentage = coalesce(base_genetic_percentage, genetic_percentage),
  base_medical_percentage = coalesce(base_medical_percentage, medical_percentage);

create or replace function preserve_assessment_base_scores() returns trigger
language plpgsql set search_path = public as $$
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

drop trigger if exists assessments_preserve_base_scores on assessments;
create trigger assessments_preserve_base_scores before insert on assessments
for each row execute function preserve_assessment_base_scores();

-- 3. Assessment answers table
create table if not exists assessment_answers (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  question_id int not null,
  answer text not null,
  score int null check (score between 1 and 4),
  category text null check (category in ('Nutrition', 'Toxin', 'Mental', 'Physical', 'Genetic', 'Medical')),
  subcategory text null,
  created_at timestamptz default now()
);

create index if not exists assessment_answers_assessment_id_idx on assessment_answers(assessment_id);

alter table assessment_answers add column if not exists score int null check (score between 1 and 4);
alter table assessment_answers add column if not exists category text null check (category in ('Nutrition', 'Toxin', 'Mental', 'Physical', 'Genetic', 'Medical'));
alter table assessment_answers add column if not exists subcategory text null;

-- Authenticated users can create and manage only their own assessments.
alter table assessments enable row level security;
alter table assessment_answers enable row level security;

drop policy if exists "Users can read own assessments" on assessments;
create policy "Users can read own assessments"
on assessments for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own assessments" on assessments;
create policy "Users can create own assessments"
on assessments for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own assessments" on assessments;
create policy "Users can delete own assessments"
on assessments for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own assessment answers" on assessment_answers;
create policy "Users can read own assessment answers"
on assessment_answers for select to authenticated
using (
  exists (
    select 1 from assessments
    where assessments.id = assessment_answers.assessment_id
      and assessments.user_id = auth.uid()
  )
);

drop policy if exists "Users can create own assessment answers" on assessment_answers;
create policy "Users can create own assessment answers"
on assessment_answers for insert to authenticated
with check (
  exists (
    select 1 from assessments
    where assessments.id = assessment_answers.assessment_id
      and assessments.user_id = auth.uid()
  )
);

-- 4. Admin-managed knowledge source files and metadata
create table if not exists source_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null check (source_type in ('pdf', 'video', 'image', 'text')),
  original_filename text,
  storage_path text,
  category text[] null check (
    category is null or
    category <@ array['Nutrition', 'Toxin', 'Mental', 'Physical', 'Genetic', 'Medical']::text[]
  ),
  status text not null default 'queued' check (status in ('queued', 'processing', 'complete', 'failed')),
  error_message text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists source_documents_uploaded_by_idx on source_documents(uploaded_by);
create index if not exists source_documents_created_at_idx on source_documents(created_at desc);
alter table source_documents enable row level security;

-- No source_documents RLS policies: Laravel's service role is the only access path.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge-source-files',
  'knowledge-source-files',
  false,
  52428800,
  array['application/pdf', 'video/mp4', 'video/quicktime', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 5. Extracted knowledge chunks and semantic-search function
create extension if not exists vector with schema extensions;

create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references source_documents(id) on delete cascade,
  content text not null,
  chunk_index integer not null check (chunk_index >= 0),
  embedding extensions.vector(1536),
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (source_document_id, chunk_index)
);

create index if not exists knowledge_chunks_source_document_id_idx on knowledge_chunks(source_document_id);
create index if not exists knowledge_chunks_embedding_hnsw_idx
  on knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);
alter table knowledge_chunks enable row level security;

-- No knowledge_chunks RLS policies: Laravel's service role is the only access path.
create or replace function match_knowledge_chunks(
  query_embedding extensions.vector(1536),
  match_count integer default 8,
  filter_categories text[] default null
)
returns table (
  id uuid,
  source_document_id uuid,
  content text,
  chunk_index integer,
  metadata jsonb,
  categories text[],
  similarity double precision
)
language sql stable
set search_path = public, extensions
as $$
  select
    knowledge_chunks.id,
    knowledge_chunks.source_document_id,
    knowledge_chunks.content,
    knowledge_chunks.chunk_index,
    knowledge_chunks.metadata,
    source_documents.category,
    1 - (knowledge_chunks.embedding <=> query_embedding)
  from knowledge_chunks
  join source_documents on source_documents.id = knowledge_chunks.source_document_id
  where knowledge_chunks.embedding is not null
    and (filter_categories is null or source_documents.category && filter_categories)
  order by knowledge_chunks.embedding <=> query_embedding
  limit greatest(match_count, 0);
$$;

revoke all on function match_knowledge_chunks(extensions.vector, integer, text[])
  from public, anon, authenticated;
grant execute on function match_knowledge_chunks(extensions.vector, integer, text[])
  to service_role;

-- 6. User-owned health chat history
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_created_at_idx on chat_messages(user_id, created_at);
alter table chat_messages enable row level security;

drop policy if exists "Users can read own chat messages" on chat_messages;
create policy "Users can read own chat messages" on chat_messages for select to authenticated
using (auth.uid() = user_id);
drop policy if exists "Users can create own chat messages" on chat_messages;
create policy "Users can create own chat messages" on chat_messages for insert to authenticated
with check (auth.uid() = user_id);
drop policy if exists "Users can update own chat messages" on chat_messages;
create policy "Users can update own chat messages" on chat_messages for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own chat messages" on chat_messages;
create policy "Users can delete own chat messages" on chat_messages for delete to authenticated
using (auth.uid() = user_id);

-- 7. AI jobs table for model / prompt runs
-- 7. Personalized pathway tasks and periodic completions
create table if not exists health_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid references assessments(id) on delete cascade,
  category text not null check (category in ('Nutrition', 'Toxin', 'Mental', 'Physical', 'Genetic', 'Medical')),
  title text not null,
  description text,
  impact_level text not null check (impact_level in ('high', 'medium', 'low')),
  frequency text not null check (frequency in ('daily', 'weekly')),
  points_value integer not null check (points_value > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table health_tasks add column if not exists assessment_id uuid references assessments(id) on delete cascade;
create index if not exists health_tasks_assessment_id_idx on health_tasks(assessment_id);

create index if not exists health_tasks_user_category_idx on health_tasks(user_id, category) where is_active;
alter table health_tasks enable row level security;
drop policy if exists "Users can read own health tasks" on health_tasks;
create policy "Users can read own health tasks" on health_tasks for select to authenticated
using (auth.uid() = user_id);

create table if not exists task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references health_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  period_key text not null,
  unique (task_id, period_key)
);

create index if not exists task_completions_user_period_idx on task_completions(user_id, period_key);
alter table task_completions enable row level security;
drop policy if exists "Users can read own task completions" on task_completions;
create policy "Users can read own task completions" on task_completions for select to authenticated
using (auth.uid() = user_id);

-- No insert/update/delete policies: task writes go through authenticated Laravel endpoints.

create table if not exists task_generation_pathways (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('Nutrition', 'Toxin', 'Mental', 'Physical', 'Genetic', 'Medical')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'complete', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, category)
);
alter table task_generation_pathways enable row level security;
-- No client policies: Laravel's service role owns generation state.

create table if not exists user_login_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  login_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, login_date)
);
create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_code text not null check (badge_code in ('starter','on_track','analyst','optimized','health_champion','ultimate')),
  earned_at timestamptz not null default now(),
  unique (user_id, badge_code)
);
alter table user_badges drop constraint if exists user_badges_badge_code_check;
alter table user_badges add constraint user_badges_badge_code_check check (badge_code in ('starter','on_track','analyst','optimized','health_champion','ultimate'));
create table if not exists user_notifications (
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
alter table user_login_days enable row level security;
alter table user_badges enable row level security;
alter table user_notifications enable row level security;
drop policy if exists "Users read own login days" on user_login_days;
create policy "Users read own login days" on user_login_days for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users read own badges" on user_badges;
create policy "Users read own badges" on user_badges for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users read own notifications" on user_notifications;
create policy "Users read own notifications" on user_notifications for select to authenticated using (auth.uid() = user_id);

-- 8. AI jobs table for model / prompt runs
create table if not exists ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  assessment_id uuid references assessments(id) on delete set null,
  status text not null default 'pending',
  result jsonb null,
  prompt text null,
  error text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists ai_jobs_user_id_idx on ai_jobs(user_id);
create index if not exists ai_jobs_assessment_id_idx on ai_jobs(assessment_id);

-- 9. Optional user feedback table
create table if not exists assessment_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  assessment_id uuid references assessments(id) on delete cascade,
  rating int null,
  comments text null,
  created_at timestamptz default now()
);

create index if not exists assessment_feedback_user_id_idx on assessment_feedback(user_id);
create index if not exists assessment_feedback_assessment_id_idx on assessment_feedback(assessment_id);
