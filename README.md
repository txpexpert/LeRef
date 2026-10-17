# Plateforme de guides pratiques — Maroc

Site d'abonnement pour consulter des guides professionnels paragraphe par paragraphe.
Premier guide : **Guide des procédures douanières**. La plateforme est organisée en **10 dossiers**
(domaines), chacun représenté par sa couverture sur la page d'accueil ; les autres guides s'y ajoutent sans modification du code.

**Pile technique** : Next.js 14 (App Router, TypeScript) sur Vercel · Supabase (Postgres + authentification).

---

## 1. Organisation du dépôt

```
content/                      ← LE CONTENU (version de référence)
  dossiers.json               ← les 10 dossiers de la page d'accueil : titre, couverture, guides rattachés
  bases.json                  ← liste des guides : titre, description, publié ou non, paragraphes en accès libre
  douane/
    00_PLAN_Guide.md          ← plan numéroté du guide (v3 : 171 paragraphes)
    chapitres/PARTIE_*.json   ← fichiers produits par le projet de rédaction (45 chapitres)
    parcours.json             ← parcours par situation
    liminaires.json           ← édition, date « à jour au », avertissement, mode d'emploi, abréviations
    logigrammes.json          ← index des figures : n°, titre, sources, paragraphe de rattachement
    figures/figure-NN.webp    ← images des logigrammes (jamais publiées en accès direct)
    modeles.json              ← modèles d'actes (M1 à M4) : usage, textes, modèle, pièces, vigilance, renvois
public/couvertures/           ← couvertures des dossiers (webp, une par dossier)
scripts/
  montage.ts                  ← contrôle + chargement du contenu dans Supabase
  impact.ts                   ← quels paragraphes citent un texte donné
supabase/migrations/
  001_socle.sql               ← schéma complet (à exécuter une fois)
  002_assistant.sql           ← assistant IA (phase ultérieure)
  003_annexes.sql             ← liminaires, logigrammes, modèles d'actes
  004_import_direct.sql       ← import direct, archive des versions, dossiers en base
app/                          ← pages du site
lib/                          ← accès aux données, sessions, quotas, filigrane, facturation
components/                   ← éléments d'interface
rapports/                     ← rapports de montage (générés)
```

### Pages du guide

| Adresse | Contenu | Accès |
|---|---|---|
| `/douane` | Sommaire, édition, date de mise à jour | public |
| `/douane/chapitre/2.2` | « Dans ce chapitre » : paragraphes et leur « En bref », logigrammes et modèles du chapitre | public (liens abonnés) |
| `/douane/presentation` | Avertissement, mode d'emploi, abréviations | public |
| `/douane/annexes` | Index des 13 logigrammes et des 4 modèles d'actes | titres publics, liens abonnés |
| `/douane/p/7-004` | Paragraphe, avec son logigramme et le modèle d'acte lié | abonnés (ou paragraphe en accès libre) |
| `/douane/modeles/M1` | Modèle d'acte, filigrané, imprimable | abonnés |
| `/douane/textes` | Table des textes cités, par rubrique | abonnés |
| `/douane/figures/8` | Image d'un logigramme, servie après contrôle d'accès | abonnés (ou paragraphe en accès libre) |

### Interface et maquette

Le site n'utilise pas de fichiers HTML autonomes : chaque page (accueil, sommaire,
lecture, compte, administration) est un modèle TSX que le serveur transforme en
HTML **après** avoir vérifié l'accès. Un visiteur ne reçoit donc jamais un contenu
auquel il n'a pas droit, et aucun fichier ne regroupe le guide entier.
La page d'accueil (`app/page.tsx`, adresse `/`) est la page d'entrée du site.

Le dossier `maquette/` contient la version HTML de démonstration (22 pages, même
interface, données fictives pour les comptes, les 171 paragraphes de l'édition 2026). Elle sert aux présentations et aux
prospects ; elle n'est **pas déployée** (`.vercelignore`). Comme elle contient du
contenu réel, gardez le dépôt GitHub **privé**.

## 2. Démarrer en local, sans Supabase (première version)

Supabase n'est **pas nécessaire** pour consulter et relire le guide. Tant que les
variables Supabase ne sont pas renseignées, le site passe en **mode local** : il lit
directement le dossier `content/` (chapitres JSON, plan, logigrammes, modèles
d'actes, pages liminaires). Toutes les pages du guide sont lisibles ; les comptes,
abonnements, quotas et la facturation sont désactivés.

```bash
npm install
npm run dev            # puis ouvrir http://localhost:3000
```

- Ne créez pas de fichier `.env.local` (ou laissez les lignes Supabase vides).
- Une correction dans `content/` est visible en rechargeant la page.
- Le bandeau « Version locale » rappelle le mode en cours.
- `npm run montage:controle` vérifie le contenu (doublons, renvois cassés, figures) sans base.

Supabase devient nécessaire au moment de la mise en ligne commerciale : comptes,
essais, abonnements, quotas, journal des consultations, facturation, et protection
du contenu côté serveur. Suivez alors le § 3.

## 3. Mise en place en ligne (une seule fois)

### 3.1 Supabase
1. Créez un **nouveau projet Supabase** dédié à la plateforme (région Europe).
2. Dans *SQL Editor*, exécutez le contenu de `supabase/migrations/001_socle.sql`,
   puis celui de `003_annexes.sql`, puis celui de `004_import_direct.sql`.
3. Dans *Authentication › URL Configuration* :
   - *Site URL* : l'adresse du site (ex. `https://guides.exemple.ma`)
   - *Redirect URLs* : `https://guides.exemple.ma/auth/callback`
4. Dans *Authentication › Providers › Email* : laissez **Confirm email** activé.
5. Dans *Authentication › Email Templates*, traduisez les modèles en français.
   Pour la production, configurez un SMTP (*Settings › Auth › SMTP*) : l'envoi
   intégré de Supabase est limité à quelques messages par heure.
6. Récupérez dans *Settings › API* : l'URL, la clé `anon` et la clé `service_role`.

### 3.2 Variables d'environnement
Copiez `.env.example` en `.env.local` (poste local) et renseignez les mêmes
valeurs dans Vercel (*Settings › Environment Variables*).
**La clé `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais être publiée ni commitée.**

### 3.3 Tarifs
Les prix ne sont pas fixés dans le code. Dans Supabase (*Table Editor › plans*),
renseignez `prix_ht` (en MAD HT) pour chaque formule. Tant qu'un prix est vide,
la formule s'affiche « Sur devis » et ne peut pas être commandée.
Les quotas de consultation (`quota_heure`, `quota_jour`) se règlent au même endroit.

### 3.4 Premier chargement du contenu
```bash
npm install
npm run montage:controle      # contrôle seul, produit rapports/douane-AAAA-MM-JJ.md
npm run montage -- douane     # contrôle + chargement dans Supabase
```

### 3.5 Compte administrateur
Créez votre compte via la page *Créer un compte* du site, puis dans *SQL Editor* :
```sql
update public.profils set est_admin = true where email = 'votre@adresse.ma';
```

### 3.6 Déploiement Vercel
1. Importez le dépôt GitHub dans Vercel, renseignez les variables d'environnement, déployez.
2. Ajoutez le domaine (ex. `guides.import-expert.ma` ou un domaine dédié).
3. Dans GitHub (*Settings › Secrets › Actions*), ajoutez `NEXT_PUBLIC_SUPABASE_URL`
   et `SUPABASE_SERVICE_ROLE_KEY` : chaque modification du dossier `content/`
   poussée sur `main` déclenche alors le montage automatique.

## 4. Travail courant

| Je veux… | Je fais… |
|---|---|
| **Mettre à jour le site tout de suite, sans GitHub** | *Administration › Importer* : je dépose le ou les fichiers modifiés, « Vérifier », puis « Publier » (voir § 4 bis) |
| Ajouter un chapitre rédigé | Je dépose `PARTIE_N_CHC.json` dans `content/douane/chapitres/` et je pousse sur GitHub |
| Corriger un paragraphe | Je remplace le fichier du chapitre et je pousse |
| Savoir ce qui manque | Je lis le dernier rapport (`rapports/` ou *Administration › Montages*) |
| Trouver les paragraphes touchés par une nouvelle circulaire | `npm run impact -- "6538/313"` |
| Ouvrir un paragraphe en accès libre | J'ajoute son numéro dans `gratuits` de `content/bases.json` |
| Valider un virement reçu | *Administration › Paiements* : je saisis la référence du virement |
| Ajouter ou corriger un logigramme | Je dépose l'image dans `content/douane/figures/` et je renseigne `logigrammes.json` (n°, titre, sources, paragraphe) |
| Ajouter un modèle d'acte | J'ajoute une entrée dans `content/douane/modeles.json` (code M5, M6…) |
| Changer la date « à jour au » ou l'avertissement | Je modifie `content/douane/liminaires.json` |
| Ajouter un nouveau guide | Voir § 6 |

Le rapport de montage signale : erreurs bloquantes (numéros en double, hors plage,
JSON invalide), renvois cassés, balises à trancher, paragraphes ajoutés hors plan,
paragraphes à l'ancien gabarit, sections du plan non rédigées.

## 4 bis. Mise à jour immédiate : *Administration › Importer*

Les pages du site sont rendues à chaque requête depuis Supabase (aucun cache) : dès qu'une
ligne change en base, la page change au rechargement suivant. L'import direct écrit en base
sans passer par GitHub :

1. Choisir le guide, déposer un ou plusieurs fichiers (glisser-déposer) :
   `PARTIE_N_CHC.json` (ou `DOU_PARTIE_N_CHC.json`), `00_PLAN_*.md`, `liminaires.json`,
   `parcours.json`, `modeles.json`, `logigrammes.json` + images `figure-NN.webp`,
   `bases.json`, `dossiers.json`.
2. **Vérifier sans publier** : mêmes contrôles que le montage (numéros, plages, doublons,
   renvois, figures) et liste des paragraphes ajoutés / modifiés / inchangés.
3. **Publier sur le site** : seuls les paragraphes réellement modifiés sont réécrits ;
   l'ancienne version est archivée automatiquement (`paragraphes_versions`). Si un seul
   fichier contient une erreur, **rien** n'est écrit.
4. Un paragraphe supprimé d'un fichier de chapitre est signalé ; il n'est retiré du site que
   si la case « Retirer… » est cochée (il reste archivé).
5. Revenir en arrière : `select public.restaurer_paragraphe(<id>);` avec l'`id` lu dans
   `paragraphes_versions`.

**Nouveau guide** : bouton « Nouveau guide… », saisir le slug, déposer ensemble `bases.json`
(qui déclare le guide, avec `"code": "FISC"` par exemple), le plan, les chapitres et les
annexes ; puis `dossiers.json` pour le rattacher à sa couverture. Aucun redéploiement.

Pensez à reporter aussi le fichier dans `content/` du dépôt : GitHub reste la copie de
référence (et le montage automatique réimporte à l'identique, sans créer de version).

## 5. Protection du contenu (ce qui est en place)

1. **Aucune lecture possible avec la clé publique.** Le RLS est activé et forcé sur
   toutes les tables, sans aucune règle d'accès pour les rôles `anon` et
   `authenticated`. Les fonctions SQL sont fermées au public. Le navigateur ne parle
   jamais à la base : seul le serveur du site la lit, avec la clé secrète, après
   contrôle de la session et de l'abonnement.
2. **Un paragraphe par page.** Aucune route ne renvoie le contenu en bloc. La
   recherche ne renvoie que des titres et des extraits de 30 mots, 20 par page, et
   elle est réservée aux abonnés.
3. **Quotas par utilisateur** (par heure et par jour, réglables par formule). Relire
   un paragraphe déjà consulté dans les 24 h reste permis.
4. **Journal des consultations** et page *Administration › Surveillance* : repère les
   lectures séquentielles intensives (signature d'un robot), avec blocage 24 h ou
   30 jours.
5. **Une session active par compte** : une nouvelle connexion ferme la précédente.
6. **Filigrane visible** (nom, entreprise, date en fond de page, y compris à
   l'impression) et **empreinte invisible** propre à chaque compte, qui survit au
   copier-coller. *Administration › Identifier une copie* retrouve le compte
   d'origine d'un texte retrouvé à l'extérieur.
7. **Copie encadrée** : 1 500 caractères au maximum par copie, avec la source et le
   nom de l'abonné ajoutés automatiquement.
8. **En-têtes de sécurité** : CSP stricte, interdiction d'intégration dans un autre
   site, pages réservées jamais mises en cache ni indexées.
9. **Robots d'IA refusés** dans `robots.txt` ; les moteurs de recherche n'indexent
   que les pages publiques (accueil, sommaire, tarifs, parcours).
10. **Inscriptions** : domaines refusés (`gov.ma`, voir `lib/config.ts`), mot de
    passe de 10 caractères minimum, confirmation de l'e-mail, contrôle anti-robot
    Cloudflare Turnstile si les clés sont renseignées.

**À activer dans Vercel** (*Firewall*) : une règle de limitation de débit sur
`/connexion` et `/inscription`, et une règle globale (par exemple 300 requêtes par
minute et par adresse IP), ainsi que la protection contre les robots.

## 6. Dossiers et nouveaux guides

La page d'accueil affiche les **10 dossiers** (`content/dossiers.json`) sous forme de couvertures :
douane, fiscalité, changes, investissements, financements, bancaire, sociétés et travail, immobilier,
urbanisme, tourisme. Un dossier est « Disponible » (couverture cliquable) dès qu'un guide qui lui est
rattaché est publié ; sinon il s'affiche « Bientôt ». Un dossier à guide unique mène directement au
sommaire du guide ; un dossier à plusieurs guides ouvre la page `/dossier/<slug>`.

Les dossiers `content/<slug>/` des 9 autres domaines existent déjà (vides, avec un `LISEZMOI.md`).
Pour publier un guide, par exemple la fiscalité :

1. Déposez ses fichiers dans `content/fiscal/` : `00_PLAN_Guide.md`, `chapitres/PARTIE_*.json`,
   `liminaires.json`, etc. (même format que la douane) ; les PDF vont dans `content/fiscal/sources/`.
2. Ajoutez une entrée dans `content/bases.json` avec `"slug": "fiscal"`, `titre`, `description`,
   `ordre` et `"publie": true`.
3. Dans `content/dossiers.json`, rattachez-le au dossier : `"guides": ["fiscal"]`.
4. Lancez `npm run montage -- fiscal` (mode Supabase) : le dossier passe à « Disponible » et le guide
   apparaît dans le menu.
5. Créez les formules correspondantes dans la table `plans` (champ `bases` : `{fiscal}`, ou `{*}`
   pour une formule tous guides).

Le slug d'un guide ne peut pas être `dossier` (adresse réservée). Une couverture se remplace en
déposant un fichier `.webp` de même nom dans `public/couvertures/` (et dans
`maquette/assets/couvertures/` pour la maquette).

## 7. Abonnements et facturation

- **Essai** : à la création du compte, l'utilisateur renseigne son entreprise et
  démarre un essai de 7 jours (quotas réduits, réglables dans `plans`).
- **Commande** : le gestionnaire choisit une formule → une **facture proforma**
  (PF-AAAA-NNNN) est émise au nom de l'entreprise, avec RIB et libellé de virement.
- **Paiement** : à réception du virement, l'administrateur saisit la référence →
  la **facture définitive** (FA-AAAA-NNNN) est numérotée et l'abonnement activé.
  Un renouvellement anticipé démarre à la fin de la période en cours.
- **Équipes** : le gestionnaire invite ses collaborateurs dans la limite des accès
  de la formule (*Mon compte › Utilisateurs*).
- Les factures s'impriment ou s'enregistrent en PDF depuis le navigateur.
- L'émetteur (raison sociale, ICE, RC, IF, RIB…) se règle par les variables
  `FACTURE_*`.

## 8. Prochaines étapes prévues

- Envoi automatique par e-mail de la proforma et des alertes de mise à jour
  (via un service d'envoi, par exemple Resend) ; rappel de fin d'essai.
- Mise en ligne des textes intégraux des circulaires dans `textes_sources`.
- Assistant IA (`002_assistant.sql`), avec quota de questions.
- Paiement en ligne, le moment venu.
- Faire relire les CGU, la politique de confidentialité et les mentions légales
  (`app/legal/[doc]/page.tsx`), et effectuer la déclaration CNDP (loi 09-08).
