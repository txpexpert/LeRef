-- Phase 3 : assistant IA (à exécuter le moment venu)
-- Recherche sémantique sur les paragraphes, comme pour Import-IA, mais
-- toujours appelée depuis le serveur du site, jamais depuis le navigateur.
create extension if not exists vector;

alter table public.paragraphes add column if not exists embedding vector(1536);
create index if not exists paragraphes_embedding_idx
  on public.paragraphes using hnsw (embedding vector_cosine_ops);

create or replace function public.paragraphes_proches(p_base text, p_vecteur vector(1536), p_nombre int default 6)
returns table (num text, titre text, contenu jsonb, similarite float)
language sql stable security definer set search_path = public as $$
  select num, titre, contenu, 1 - (embedding <=> p_vecteur)
  from public.paragraphes
  where base = p_base and statut = 'publie' and embedding is not null
  order by embedding <=> p_vecteur
  limit least(p_nombre, 8);
$$;
revoke execute on function public.paragraphes_proches(text, vector, int) from public, anon, authenticated;
