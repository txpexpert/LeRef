-- =====================================================================
-- Import direct du contenu (à exécuter après 001_socle.sql et 003_annexes.sql)
-- ---------------------------------------------------------------------
-- Objectif : déposer un fichier JSON modifié dans Administration › Importer
-- et voir la page du site changer immédiatement, sans passer par GitHub.
--
--  · paragraphes.version + table paragraphes_versions : chaque modification
--    ou retrait d'un paragraphe archive automatiquement l'ancienne version
--    (déclencheur), quelle que soit la voie d'import (page admin ou montage) ;
--  · restaurer_paragraphe(id) : revenir à une version archivée ;
--  · dossiers : les couvertures de la page d'accueil, modifiables par import
--    de dossiers.json (au lieu d'un redéploiement) ;
--  · bases.code : code du guide (DOU, FISC…) pour accepter les numéros
--    préfixés « DOU-7-012 » ;
--  · figures.fichier, image facultative : un logigramme peut être déclaré
--    avant que son image soit déposée.
-- Même règle de sécurité que le socle : RLS forcé, aucun accès public.
-- =====================================================================

alter table public.bases add column if not exists code text unique;

alter table public.paragraphes add column if not exists version int not null default 1;
alter table public.paragraphes add column if not exists source  text;   -- fichier d'origine (ex. PARTIE_7_CH1.json)

create table if not exists public.paragraphes_versions (
  id          bigint generated always as identity primary key,
  base        text not null,
  num         text not null,
  version     int  not null,
  motif       text not null check (motif in ('modification','retrait')),
  ligne       jsonb not null,                       -- copie complète de la ligne archivée
  archive_le  timestamptz not null default now()
);
create index if not exists paragraphes_versions_idx on public.paragraphes_versions (base, num, archive_le desc);

-- Archivage automatique : seule une modification réelle du contenu crée une version
create or replace function public.archiver_paragraphe() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.contenu is distinct from old.contenu or new.titre is distinct from old.titre then
      insert into public.paragraphes_versions (base, num, version, motif, ligne)
      values (old.base, old.num, old.version, 'modification', to_jsonb(old) - 'recherche' - 'embedding');
      new.version := old.version + 1;
    else
      new.version := old.version;
    end if;
    return new;
  end if;
  insert into public.paragraphes_versions (base, num, version, motif, ligne)
  values (old.base, old.num, old.version, 'retrait', to_jsonb(old) - 'recherche' - 'embedding');
  return old;
end $$;
drop trigger if exists paragraphes_archive_maj on public.paragraphes;
create trigger paragraphes_archive_maj before update on public.paragraphes
  for each row execute function public.archiver_paragraphe();
drop trigger if exists paragraphes_archive_retrait on public.paragraphes;
create trigger paragraphes_archive_retrait before delete on public.paragraphes
  for each row execute function public.archiver_paragraphe();

-- Revenir à une version archivée (la version courante est elle-même archivée)
create or replace function public.restaurer_paragraphe(p_version bigint) returns text
language plpgsql security definer set search_path = public as $$
declare v public.paragraphes_versions; r public.paragraphes;
begin
  select * into v from public.paragraphes_versions where id = p_version;
  if v.id is null then raise exception 'Version % introuvable', p_version; end if;
  r := jsonb_populate_record(null::public.paragraphes, v.ligne);
  insert into public.paragraphes (base, num, partie, chapitre, ordre, titre, enbref, contenu, maj, verif, modifie, gratuit, statut, source, importe_le)
  values (r.base, r.num, r.partie, r.chapitre, r.ordre, r.titre, r.enbref, r.contenu, r.maj, r.verif, r.modifie, r.gratuit, r.statut, r.source, now())
  on conflict (base, num) do update set
    partie = excluded.partie, chapitre = excluded.chapitre, ordre = excluded.ordre, titre = excluded.titre,
    enbref = excluded.enbref, contenu = excluded.contenu, maj = excluded.maj, verif = excluded.verif,
    modifie = excluded.modifie, statut = excluded.statut, source = excluded.source, importe_le = now();
  return v.base || ' ' || v.num;
end $$;

-- Dossiers de la page d'accueil (copie de content/dossiers.json)
create table if not exists public.dossiers (
  slug        text primary key,
  ordre       int  not null default 0,
  court       text not null,
  titre       text not null,
  couverture  text,
  guides      text[] not null default '{}'
);

-- Logigrammes : nom du fichier image, image facultative tant qu'elle n'est pas déposée
alter table public.figures add column if not exists fichier text;
alter table public.figures alter column image drop not null;
alter table public.figures add column if not exists a_image boolean generated always as (image is not null) stored;
create index if not exists figures_fichier_idx on public.figures (base, fichier);

-- Journal : voie d'import et fichiers concernés
alter table public.imports add column if not exists origine  text not null default 'montage';
alter table public.imports add column if not exists fichiers text[];
alter table public.imports add column if not exists auteur   text;

do $$ declare t text; begin
  foreach t in array array['paragraphes_versions','dossiers'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
revoke execute on function public.restaurer_paragraphe(bigint) from public, anon, authenticated;
revoke execute on function public.archiver_paragraphe() from public, anon, authenticated;
