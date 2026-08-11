-- Stage 1 knowledge ingestion: source metadata and private raw-file storage only.
create table if not exists public.source_documents (
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

create index if not exists source_documents_uploaded_by_idx on public.source_documents(uploaded_by);
create index if not exists source_documents_created_at_idx on public.source_documents(created_at desc);

alter table public.source_documents enable row level security;

-- Intentionally no RLS policies. Browser clients cannot access this table;
-- Laravel uses the server-only service role, which bypasses RLS.

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

-- No storage.objects policies are added. Only the service role can manage this bucket.
