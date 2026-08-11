-- Stage 2 knowledge ingestion: extracted chunks and OpenAI embeddings.
create extension if not exists vector with schema extensions;

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  content text not null,
  chunk_index integer not null check (chunk_index >= 0),
  embedding extensions.vector(1536),
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (source_document_id, chunk_index)
);

create index if not exists knowledge_chunks_source_document_id_idx
  on public.knowledge_chunks(source_document_id);

create index if not exists knowledge_chunks_embedding_hnsw_idx
  on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.knowledge_chunks enable row level security;

-- Intentionally no RLS policies. Browser clients cannot access this table;
-- Laravel uses the server-only service role, which bypasses RLS.

create or replace function public.match_knowledge_chunks(
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
language sql
stable
set search_path = public, extensions
as $$
  select
    knowledge_chunks.id,
    knowledge_chunks.source_document_id,
    knowledge_chunks.content,
    knowledge_chunks.chunk_index,
    knowledge_chunks.metadata,
    source_documents.category as categories,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks
  join public.source_documents
    on source_documents.id = knowledge_chunks.source_document_id
  where knowledge_chunks.embedding is not null
    and (
      filter_categories is null
      or source_documents.category && filter_categories
    )
  order by knowledge_chunks.embedding <=> query_embedding
  limit greatest(match_count, 0);
$$;

revoke all on function public.match_knowledge_chunks(extensions.vector, integer, text[])
  from public, anon, authenticated;
grant execute on function public.match_knowledge_chunks(extensions.vector, integer, text[])
  to service_role;
