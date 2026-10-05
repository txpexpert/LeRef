-- =====================================================================
-- Plateforme de guides pratiques — socle de la base (Supabase / Postgres)
-- =====================================================================
-- Principe de sécurité : AUCUNE table n'est lisible avec la clé publique.
-- Le RLS est activé partout et aucune politique n'est créée pour les rôles
-- anon et authenticated. Seul le serveur du site (clé service_role, gardée
-- dans les variables d'environnement Vercel) lit et écrit les données,
-- après avoir vérifié la session et l'abonnement de l'utilisateur.
-- =====================================================================

create extension if not exists unaccent;

-- Configuration de recherche française insensible aux accents
do $$ begin
  if not exists (select 1 from pg_ts_config where cfgname = 'fr_unaccent') then
    create text search configuration public.fr_unaccent ( copy = french );
    alter text search configuration public.fr_unaccent
      alter mapping for hword, hword_part, word with unaccent, french_stem;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. CONTENU (une « base » = un guide : douane, puis les autres domaines)
-- ---------------------------------------------------------------------
create table public.bases (
  slug          text primary key,                 -- ex. 'douane'
  titre         text not null,                    -- ex. 'Guide des procédures douanières'
  sous_titre    text,
  description   text,
  ordre         int  not null default 0,
  publie        boolean not null default false,   -- visible sur le site
  maj           timestamptz not null default now()
);

create table public.parties (
  base    text not null references public.bases(slug) on delete cascade,
  num     int  not null,
  titre   text not null,
  primary key (base, num)
);

create table public.chapitres (
  base        text not null references public.bases(slug) on delete cascade,
  code        text not null,                      -- ex. '7.2'
  partie      int  not null,
  ordre       int  not null,
  titre       text not null,
  plage_debut text,
  plage_fin   text,
  primary key (base, code),
  foreign key (base, partie) references public.parties(base, num) on delete cascade
);

create table public.paragraphes (
  base        text not null references public.bases(slug) on delete cascade,
  num         text not null,                      -- ex. '7-012'
  partie      int  not null,
  chapitre    text not null,                      -- ex. '7.2'
  ordre       int  not null,                      -- tri : partie*10000 + n°
  titre       text not null,
  enbref      text,
  contenu     jsonb not null,                     -- paragraphe complet (format JSON du guide)
  maj         date,
  verif       text check (verif in ('oui','partiel','non')),
  modifie     boolean not null default false,
  gratuit     boolean not null default false,     -- consultable sans abonnement
  statut      text not null default 'publie' check (statut in ('publie','brouillon','abroge')),
  recherche   tsvector,
  importe_le  timestamptz not null default now(),
  primary key (base, num)
);
create index paragraphes_recherche_idx on public.paragraphes using gin (recherche);

-- Index de recherche calculé à chaque écriture : titre > en bref > reste du contenu
create or replace function public.maj_recherche() returns trigger
language plpgsql set search_path = public as $$
begin
  -- les « / » des références (ex. 6164/313) sont remplacés par des espaces
  -- pour que chaque nombre soit trouvable séparément
  new.recherche :=
    setweight(to_tsvector('public.fr_unaccent', coalesce(new.num,'') || ' ' || coalesce(new.titre,'')), 'A') ||
    setweight(to_tsvector('public.fr_unaccent', coalesce(new.enbref,'')), 'B') ||
    setweight(to_tsvector('public.fr_unaccent',
      coalesce(new.contenu->>'principe','') || ' ' || coalesce(new.contenu->>'admin','') || ' ' ||
      coalesce(new.contenu->>'conseil','') || ' ' || coalesce(new.contenu->>'cas','') || ' ' ||
      translate(coalesce(array_to_string(array(select jsonb_array_elements_text(coalesce(new.contenu->'textes','[]'::jsonb))),' '),''), '/', ' ')), 'C');
  return new;
end $$;
create trigger paragraphes_recherche_trg before insert or update on public.paragraphes
  for each row execute function public.maj_recherche();
create index paragraphes_ordre_idx on public.paragraphes (base, ordre);
create index paragraphes_maj_idx on public.paragraphes (base, maj desc);

-- Textes sources (circulaires, articles…) rendus consultables et cliquables
create table public.textes_sources (
  base      text not null references public.bases(slug) on delete cascade,
  ref       text not null,                        -- référence normalisée
  libelle   text not null,                        -- référence telle que citée
  titre     text,
  date_texte date,
  statut    text not null default 'en_vigueur' check (statut in ('en_vigueur','abroge','inconnu')),
  texte     text,                                 -- contenu intégral (facultatif)
  primary key (base, ref)
);

-- Quel paragraphe cite quel texte (affichage + analyse d'impact des mises à jour)
create table public.citations (
  base    text not null,
  num     text not null,
  ref     text not null,
  libelle text not null,
  primary key (base, num, ref),
  foreign key (base, num) references public.paragraphes(base, num) on delete cascade
);
create index citations_ref_idx on public.citations (base, ref);

create table public.parcours (
  base        text not null references public.bases(slug) on delete cascade,
  id          text not null,
  titre       text not null,
  description text,
  etapes      text[] not null,
  gratuit     boolean not null default false,
  ordre       int not null default 0,
  primary key (base, id)
);

-- Historique des montages (rapport de contrôle de chaque import)
create table public.imports (
  id          bigint generated always as identity primary key,
  base        text not null,
  le          timestamptz not null default now(),
  paragraphes int not null,
  rapport     jsonb not null
);

-- ---------------------------------------------------------------------
-- 2. CLIENTS, ABONNEMENTS, FACTURATION
-- ---------------------------------------------------------------------
create table public.organisations (
  id            uuid primary key default gen_random_uuid(),
  raison_sociale text not null,
  ice           text,                             -- Identifiant commun de l'entreprise
  rc            text,
  adresse       text,
  ville         text,
  email_facturation text,
  telephone     text,
  cree_le       timestamptz not null default now()
);

create table public.profils (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  nom             text,
  organisation_id uuid references public.organisations(id) on delete set null,
  role_org        text not null default 'membre' check (role_org in ('membre','gestionnaire')),
  est_admin       boolean not null default false,  -- administrateur de la plateforme
  session_active  text,                            -- jeton de la seule session autorisée
  bloque_jusqua   timestamptz,                     -- blocage temporaire (quota dépassé)
  cree_le         timestamptz not null default now()
);

create table public.plans (
  code          text primary key,                 -- ex. 'douane-solo'
  nom           text not null,
  description   text,
  bases         text[] not null,                  -- guides inclus ; '{*}' = tous
  sieges        int  not null default 1,          -- nombre d'utilisateurs
  duree_mois    int  not null,
  prix_ht       numeric(12,2),                    -- en MAD ; vide = tarif à définir
  quota_jour    int  not null default 150,        -- paragraphes consultables / jour / utilisateur
  quota_heure   int  not null default 60,
  public        boolean not null default true,    -- affiché sur la page tarifs
  ordre         int  not null default 0
);

create table public.abonnements (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  plan_code       text not null references public.plans(code),
  statut          text not null default 'en_attente'
                  check (statut in ('essai','en_attente','actif','suspendu','expire','annule')),
  debut           date,
  fin             date,
  cree_le         timestamptz not null default now()
);
create index abonnements_org_idx on public.abonnements (organisation_id, statut);

create sequence public.seq_proforma;
create sequence public.seq_facture;

create table public.factures (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  abonnement_id   uuid references public.abonnements(id) on delete set null,
  numero_proforma text not null unique,
  numero_facture  text unique,                    -- attribué au paiement
  date_proforma   date not null default current_date,
  date_facture    date,
  libelle         text not null,
  montant_ht      numeric(12,2) not null,
  taux_tva        numeric(5,2) not null default 20,
  montant_tva     numeric(12,2) not null,
  montant_ttc     numeric(12,2) not null,
  statut          text not null default 'proforma' check (statut in ('proforma','payee','annulee')),
  reference_virement text,
  payee_le        date,
  client          jsonb not null                  -- copie figée des coordonnées client
);

-- Numérotation : PF-2026-0001 (proforma) et FA-2026-0001 (facture)
create or replace function public.prochain_numero(prefixe text) returns text
language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  if prefixe = 'PF' then n := nextval('public.seq_proforma');
  else n := nextval('public.seq_facture'); end if;
  return prefixe || '-' || to_char(current_date, 'YYYY') || '-' || lpad(n::text, 4, '0');
end $$;

-- Activation d'un abonnement à réception du virement (appelée par l'admin)
create or replace function public.valider_paiement(p_facture uuid, p_reference text)
returns void language plpgsql security definer set search_path = public as $$
declare f public.factures; a public.abonnements; d int; depart date;
begin
  select * into f from public.factures where id = p_facture for update;
  if f.id is null or f.statut <> 'proforma' then
    raise exception 'Facture introuvable ou déjà traitée';
  end if;
  update public.factures set statut = 'payee', reference_virement = p_reference,
    payee_le = current_date, date_facture = current_date,
    numero_facture = public.prochain_numero('FA')
  where id = p_facture;
  if f.abonnement_id is not null then
    select * into a from public.abonnements where id = f.abonnement_id;
    select duree_mois into d from public.plans where code = a.plan_code;
    -- un renouvellement anticipé démarre à la fin de l'abonnement actif en cours
    select greatest(current_date, coalesce(max(fin), current_date)) into depart
      from public.abonnements
      where organisation_id = a.organisation_id and statut = 'actif' and id <> a.id;
    update public.abonnements set statut = 'actif', debut = depart,
      fin = (depart + make_interval(months => d))::date
    where id = a.id;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. USAGE : journal des consultations, favoris, suivis
-- ---------------------------------------------------------------------
create table public.consultations (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references public.profils(id) on delete cascade,
  base      text not null,
  num       text not null,
  le        timestamptz not null default now(),
  ip        text,
  agent     text
);
create index consultations_user_le_idx on public.consultations (user_id, le desc);

create table public.favoris (
  user_id uuid not null references public.profils(id) on delete cascade,
  base    text not null,
  num     text not null,
  le      timestamptz not null default now(),
  primary key (user_id, base, num)
);

create table public.suivis (
  user_id uuid not null references public.profils(id) on delete cascade,
  base    text not null,
  num     text not null,
  le      timestamptz not null default now(),
  primary key (user_id, base, num)
);

-- Comptes ayant une activité suspecte sur les dernières 24 h :
-- volume élevé et lecture majoritairement séquentielle (signature d'un robot)
create or replace view public.surveillance_24h as
with c as (
  select user_id, base, num, le,
         lag(num) over (partition by user_id order by le) as prec
  from public.consultations where le > now() - interval '24 hours'
), s as (
  select user_id, count(*) as lectures,
         count(*) filter (where prec is not null
           and split_part(num,'-',1) = split_part(prec,'-',1)
           and split_part(num,'-',2)::int = split_part(prec,'-',2)::int + 1) as sequentielles,
         count(distinct base || num) as distincts,
         min(le) as premiere, max(le) as derniere
  from c group by user_id
)
select s.*, p.email, p.nom, o.raison_sociale,
       round(100.0 * s.sequentielles / greatest(s.lectures,1)) as pct_sequentiel
from s join public.profils p on p.id = s.user_id
left join public.organisations o on o.id = p.organisation_id;

-- ---------------------------------------------------------------------
-- 4. RECHERCHE
-- ---------------------------------------------------------------------
create or replace function public.rechercher(p_base text, p_q text, p_limite int default 20, p_decalage int default 0)
returns table (num text, titre text, chapitre text, partie int, extrait text, rang real, total bigint)
language sql stable security definer set search_path = public as $$
  with q as (select websearch_to_tsquery('public.fr_unaccent', translate(p_q, '/', ' ')) as tq),
  r as (
    select p.num, p.titre, p.chapitre, p.partie,
           ts_headline('public.fr_unaccent',
             coalesce(p.enbref,'') || ' ' || coalesce(p.contenu->>'principe',''), q.tq,
             'MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>, MaxFragments=1') as extrait,
           ts_rank(p.recherche, q.tq) as rang
    from public.paragraphes p, q
    where p.base = p_base and p.statut = 'publie' and p.recherche @@ q.tq
  )
  select r.*, count(*) over () as total from r
  order by rang desc limit least(p_limite, 30) offset p_decalage;
$$;

-- ---------------------------------------------------------------------
-- 5. DROITS : tout est fermé aux rôles publics
-- ---------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['bases','parties','chapitres','paragraphes','textes_sources','citations',
    'parcours','imports','organisations','profils','plans','abonnements','factures',
    'consultations','favoris','suivis'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
revoke all on public.surveillance_24h from anon, authenticated;
revoke execute on function public.rechercher(text,text,int,int) from public, anon, authenticated;
revoke execute on function public.valider_paiement(uuid,text) from public, anon, authenticated;
revoke execute on function public.prochain_numero(text) from public, anon, authenticated;
revoke usage on sequence public.seq_proforma, public.seq_facture from anon, authenticated;

-- Création automatique du profil à l'inscription
create or replace function public.creer_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profils (id, email, nom)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nom', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.creer_profil();

-- ---------------------------------------------------------------------
-- 6. DONNÉES INITIALES (à adapter : prix indicatifs, à fixer par vous)
-- ---------------------------------------------------------------------
insert into public.plans (code, nom, description, bases, sieges, duree_mois, prix_ht, quota_jour, quota_heure, public, ordre) values
 ('essai',          'Essai gratuit 7 jours',   'Découverte du guide, accès limité.',            '{*}', 1,  0,    0,  30, 20, false, 0),
 ('douane-solo',    'Douane — Individuel',     'Un utilisateur, guide des procédures douanières.', '{douane}', 1, 12, null, 150, 60, true, 1),
 ('douane-equipe',  'Douane — Équipe 5',       'Cinq utilisateurs nommés, même organisation.',  '{douane}', 5, 12, null, 150, 60, true, 2),
 ('tous-entreprise','Tous les guides — Entreprise', 'Dix utilisateurs, tous les guides publiés.', '{*}', 10, 12, null, 200, 80, true, 3)
on conflict (code) do nothing;

-- Consultations distinctes de l'utilisateur sur 1 h et 24 h (contrôle des quotas)
create or replace function public.usage_utilisateur(p_user uuid)
returns table (heure bigint, jour bigint)
language sql stable security definer set search_path = public as $$
  select count(distinct base || num) filter (where le > now() - interval '1 hour'),
         count(distinct base || num)
  from public.consultations
  where user_id = p_user and le > now() - interval '24 hours';
$$;
revoke execute on function public.usage_utilisateur(uuid) from public, anon, authenticated;
