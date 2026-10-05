-- =====================================================================
-- Éléments de l'ouvrage hors paragraphes (à exécuter après 001_socle.sql)
-- ---------------------------------------------------------------------
--  · pages liminaires d'un guide : édition, date de mise à jour,
--    avertissement, mode d'emploi, abréviations ;
--  · logigrammes (figures) rattachés à un paragraphe ;
--  · modèles d'actes.
-- Même règle que le socle : RLS activé et forcé, aucun accès pour les rôles
-- anon et authenticated. Les images ne sont servies que par le serveur du
-- site, après contrôle de l'abonnement (route /[base]/figures/[num]).
-- =====================================================================

alter table public.bases add column if not exists edition    text;          -- ex. 'Édition 2026'
alter table public.bases add column if not exists a_jour_au  date;          -- date de l'état du droit
alter table public.bases add column if not exists liminaires jsonb;         -- avertissement, mode d'emploi, abréviations

create table if not exists public.figures (
  base        text not null references public.bases(slug) on delete cascade,
  num         int  not null,                      -- n° de figure (1, 2, 3…)
  titre       text not null,
  sources     text,
  paragraphe  text not null,                      -- paragraphe où le logigramme est inséré
  mime        text not null default 'image/webp',
  largeur     int,
  hauteur     int,
  image       text not null,                      -- image encodée en base64
  primary key (base, num),
  foreign key (base, paragraphe) references public.paragraphes(base, num) on delete cascade
);
create index if not exists figures_paragraphe_idx on public.figures (base, paragraphe);

create table if not exists public.modeles (
  base       text not null references public.bases(slug) on delete cascade,
  code       text not null,                       -- ex. 'M1'
  ordre      int  not null default 0,
  titre      text not null,
  usage      text,
  textes     jsonb not null default '[]'::jsonb,  -- textes applicables
  corps      jsonb not null default '[]'::jsonb,  -- paragraphes du modèle (pointillés à compléter)
  pieces     jsonb not null default '[]'::jsonb,  -- pièces à joindre
  vigilance  jsonb not null default '[]'::jsonb,  -- points de vigilance
  renvois    text[] not null default '{}',        -- paragraphes liés
  figures    int[]  not null default '{}',        -- logigrammes liés
  primary key (base, code)
);
create index if not exists modeles_renvois_idx on public.modeles using gin (renvois);

do $$ declare t text; begin
  foreach t in array array['figures','modeles'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
