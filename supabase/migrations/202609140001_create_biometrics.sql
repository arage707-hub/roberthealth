-- Biometrics: lab documents members upload, and the readings extracted from them or entered by hand.
create table if not exists public.biometric_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_filename text not null,
  storage_path text not null,
  mime_type text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'complete', 'failed')),
  error_message text,
  readings_count integer not null default 0,
  unmatched jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists biometric_documents_user_created_idx
  on public.biometric_documents(user_id, created_at desc);

create table if not exists public.biometric_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marker_key text not null,
  value numeric,
  value_text text,
  unit text,
  measured_at date,
  source text not null default 'manual' check (source in ('manual', 'document')),
  document_id uuid references public.biometric_documents(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  check (value is not null or value_text is not null)
);

create index if not exists biometric_readings_user_marker_idx
  on public.biometric_readings(user_id, marker_key, measured_at desc, created_at desc);

alter table public.biometric_documents enable row level security;
alter table public.biometric_readings enable row level security;

drop policy if exists "Users read own biometric documents" on public.biometric_documents;
create policy "Users read own biometric documents"
on public.biometric_documents for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users read own biometric readings" on public.biometric_readings;
create policy "Users read own biometric readings"
on public.biometric_readings for select to authenticated
using (auth.uid() = user_id);

-- Writes are performed only by Laravel using the service role.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'biometric-documents',
  'biometric-documents',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects policies are added. Only the service role can manage this bucket.
