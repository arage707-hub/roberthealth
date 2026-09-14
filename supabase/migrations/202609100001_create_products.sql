-- Product catalog for AI product recommendations.
-- Admins add products (name, description, price, buy link); Laravel embeds each
-- product's text with OpenAI so it can be matched to a member's assessment.
create extension if not exists vector with schema extensions;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  price numeric(12, 2) check (price is null or price >= 0),
  currency text not null default 'USD',
  purchase_url text not null,
  image_url text,
  brand text,
  category text[] null check (
    category is null or
    category <@ array['Nutrition', 'Toxin', 'Mental', 'Physical', 'Genetic', 'Medical']::text[]
  ),
  is_active boolean not null default true,
  status text not null default 'queued' check (status in ('queued', 'processing', 'complete', 'failed')),
  error_message text,
  embedding extensions.vector(1536),
  embedding_model text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_created_at_idx on public.products(created_at desc);
create index if not exists products_active_status_idx on public.products(is_active, status);
create index if not exists products_embedding_hnsw_idx
  on public.products
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.products enable row level security;

-- Intentionally no RLS policies. Browser clients cannot access this table;
-- Laravel uses the server-only service role, which bypasses RLS.

-- Semantic search used by the recommendation step: nearest active, embedded products,
-- optionally limited to the given health pathways.
create or replace function public.match_products(
  query_embedding extensions.vector(1536),
  match_count integer default 6,
  filter_categories text[] default null
)
returns table (
  id uuid,
  name text,
  description text,
  price numeric,
  currency text,
  purchase_url text,
  image_url text,
  brand text,
  category text[],
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    products.id,
    products.name,
    products.description,
    products.price,
    products.currency,
    products.purchase_url,
    products.image_url,
    products.brand,
    products.category,
    1 - (products.embedding <=> query_embedding) as similarity
  from public.products
  where products.embedding is not null
    and products.is_active
    and products.status = 'complete'
    and (
      filter_categories is null
      or products.category is null
      or products.category && filter_categories
    )
  order by products.embedding <=> query_embedding
  limit greatest(match_count, 0);
$$;

revoke all on function public.match_products(extensions.vector, integer, text[])
  from public, anon, authenticated;
grant execute on function public.match_products(extensions.vector, integer, text[])
  to service_role;
