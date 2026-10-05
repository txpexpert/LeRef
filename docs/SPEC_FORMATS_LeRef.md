# Le Ref — Spécification des formats et de la base de données

Version 1 — 5 octobre 2026
Référence commune à tous les projets Claude (conversion PDF → JSON, rédaction de chaque guide) et au site (scripts de montage, Supabase).

---

## 1. Architecture : trois couches

```
 PDF officiels ──► [Projet Claude « Sources »] ──► SRC_*.json   ──► table textes_sources (+ morceaux vectorisés)
                                                       │
                                                       ▼
                      [Projet Claude « Guide CODE »] ──► CODE_PARTIE_N_CHC.json ──► table paragraphes (+ citations)
                                                       │
                                                       ▼
                                          parcours.json ──► table parcours
                                                       │
                                                       ▼
                         LLM d'aiguillage (plus tard) : question → guide → chapitre → paragraphes → textes cités
```

| Couche | Contenu | Qui la produit | Où elle vit |
|---|---|---|---|
| 1. Sources | Texte officiel intégral, découpé par article, avec métadonnées | Projet Claude « LeRef — Sources » à partir des PDF | Fichiers SRC_*.json → table `textes_sources` + table de morceaux pour la recherche vectorielle |
| 2. Guides | Paragraphes numérotés rédigés selon le gabarit (un guide = un dispositif légal) | Un projet Claude par guide | content/<slug>/chapitres → table `paragraphes` |
| 3. Navigation | Parcours par situation, renvois, citations | Projet du guide | `parcours`, `citations` |

Le lien entre les couches est la **référence normalisée** du texte (champ `ref`) : un paragraphe cite `"textes": ["CDII art. 85"]`, le montage normalise et crée la ligne `citations (num → ref)`. C'est ce lien qui permet ensuite à l'assistant de remonter d'une réponse au texte, et au script `impact.ts` de lister les paragraphes touchés quand un texte change.

**Principe directeur** : la couche 1 conserve le texte **à la lettre** ; toute reformulation appartient à la couche 2. Un juriste qui ouvre une source doit lire le texte officiel, pas un résumé.

---

## 2. Un guide par dispositif légal

| Élément | Règle |
|---|---|
| Code du guide | Définitif, casse exacte : DOU, ComExt, ASS, TOUR, INV, FISC, Env, Comm, Chang, bank, DOC… |
| Slug du site | Minuscules, sans accent, stable : douane, comext, assurances, tourisme, investissement, fiscalite, environnement, commercial, changes, bancaire, obligations |
| Plan | `content/<slug>/00_PLAN_<CODE>.md` |
| Paragraphes | `content/<slug>/chapitres/<CODE>_PARTIE_<N>_CH<C>.json` |
| Projet Claude | Un par guide, instructions tirées du modèle `INSTRUCTIONS_PROJET_GUIDE_modele.md` |

Registre `content/bases.json` — ajouter le champ `code` à chaque guide :

```json
{ "slug": "douane", "code": "DOU", "titre": "Guide des procédures douanières", "sous_titre": "Maroc",
  "description": "…", "ordre": 1, "publie": true, "gratuits": ["7-001"] }
```

---

## 3. Format SOURCE (sortie du projet PDF → JSON)

### 3.1 Nom de fichier
`SRC_<type>_<numero>_<AAAA-MM-JJ>.json` — ex. `SRC_decret_2-77-862_1977-10-09.json`, `SRC_circulaire_6702-210_2026-01-02.json`.
Texte trop long (code, loi de finances) : un fichier par grande division, suffixe `_P1`, `_P2`… avec la même `ref`.

### 3.2 Structure

```json
{
  "format": "leref-source-1",
  "document": {
    "ref": "decret-2-77-862",
    "guides": ["DOU"],
    "type_document": "decret",
    "numero": "2-77-862",
    "titre": "Décret n° 2-77-862 du 25 chaoual 1397 (9 octobre 1977) pris pour l'application du code des douanes…",
    "titre_court": "Décret n° 2-77-862",
    "date_hijri": "25 chaoual 1397",
    "date_texte": "1977-10-09",
    "bo": { "numero": null, "date": null, "page": null },
    "emetteur": "Premier ministre",
    "vise": ["Dahir portant loi n° 1-77-339 …"],
    "objet": "Une phrase, rédigée, sur l'objet du texte.",
    "statut": "en_vigueur",
    "version_consolidee_au": null,
    "modifie_par": [],
    "abroge": [],
    "abroge_par": null,
    "langue": "fr",
    "fichier_origine": "decret_2-77-862.pdf",
    "pages": 42,
    "qualite": "texte"
  },
  "chunks": [
    {
      "id": "decret-2-77-862__art-12",
      "ordre": 12,
      "niveau": "article",
      "chemin": ["Titre II — Dédouanement", "Chapitre premier — Déclaration en détail"],
      "article": "12",
      "content": "Texte officiel de l'article, mot pour mot, alinéas séparés par \\n.",
      "resume": "Une ou deux phrases neutres : ce que dit l'article.",
      "renvois": ["art. 15", "CDII art. 85"],
      "pages": [7, 8],
      "metadata": {
        "titre": "Décret n° 2-77-862",
        "type_document": "decret",
        "numero": "2-77-862",
        "statut": "en_vigueur",
        "domaine": "Dédouanement",
        "sous_domaine": "Déclaration en détail",
        "mots_cles": ["déclaration", "délai"],
        "regime_douanier": null,
        "nc8_concerne": null,
        "articles_couverts": ["Article 12"],
        "chunk_index": 12,
        "total_chunks": 98
      }
    }
  ],
  "tableaux": [],
  "signalements": [
    { "type": "date_incoherente", "ou": "art. 4", "detail": "En-tête : 31/10/1977 ; formule finale : 3/10/1977." }
  ]
}
```

### 3.3 Règles des champs

| Champ | Règle |
|---|---|
| `ref` | Minuscules, tirets : `<type>-<numero>` (dahir-1-77-339, loi-17-99, circulaire-6702-210, note-d85-2026). Identique dans tous les fichiers du même texte. Jamais modifiée. |
| `type_document` | dahir, loi, loi_finances, decret, arrete, circulaire, note, instruction, decision, accord, convention, jurisprudence, guide_officiel, autre |
| `statut` | en_vigueur, abroge, partiellement_abroge, inconnu (la base du site ramène partiellement_abroge à en_vigueur avec signalement) |
| `content` | **Texte officiel à la lettre.** Pas de reformulation, pas de correction. Mot illisible : `[ILLISIBLE]`. |
| `resume` | Facultatif, neutre, sans ajout. Sert à la recherche, jamais à la citation. |
| `niveau` | preambule, visa, titre, chapitre, section, article, alinea, annexe, tableau, signature |
| `id` | `<ref>__art-<n>` ; article découpé : `__art-12-a`, `__art-12-b` ; annexe : `__annexe-2` ; préambule : `__preambule` |
| `bo` | Jamais inventé : `null` + signalement si absent du PDF. |
| `qualite` | texte (PDF natif), ocr (scanné, relu), ocr_partiel (passages douteux signalés) |
| `tableaux` | `{ "id", "titre", "colonnes": [...], "lignes": [[...]] , "source_chunk": "…__art-5" }` ; le tableau figure aussi, en texte, dans le `content` de l'article |
| `signalements` | type : date_incoherente, renvoi_inconnu, abrogation_probable, bo_absent, ocr_douteux, texte_tronque, langue_mixte |

Compatibilité : les fichiers déjà déposés (format `document` + `chunks` avec `content` résumé) restent lisibles. Les nouveaux fichiers ajoutent `format`, `ref`, `guides`, `resume`, `chemin`, et `content` redevient le texte officiel.

---

## 4. Format PARAGRAPHE (sortie d'un projet de guide)

Inchangé par rapport aux instructions du projet DOU :

```json
{"id":"DOU-7-012","g":"DOU","p":7,"ch":"7.2","c":"Intitulé du chapitre","t":"Titre explicite hors contexte",
 "enbref":"…","textes":["CDII art. 85","Décret n° 2-77-862 art. 12"],"principe":"…","admin":"…",
 "donnees":[["Délai","… (réf.)"]],"cas":"…","juris":"","conseil":"…",
 "faq":[["Question","Réponse sourcée"]],"renvois":["DOU-7-011"],
 "maj":"2026-10-05","verif":"oui","v":1}
```

Champs conditionnels : `balises` (s'il en reste), `mod: true` et `hist` (si v > 1).

Règle d'écriture des `textes` pour que le lien avec la couche 1 fonctionne : **titre court du texte + article**, exactement comme dans `titre_court` de la source (« Décret n° 2-77-862 art. 12 », « Circulaire n° 6702/210 du 02/01/2026 »).

---

## 5. Format PLAN (lu par le site)

Le site lit le plan avec des expressions régulières ; respecter exactement :

```markdown
## Partie 1 — Cadre général

### Chapitre 1.1 — Sources du droit douanier  (plage 1-001 à 1-009)

- 1-001 Titre de la section
- 1-002 Titre de la section
```

Le plan ne porte pas le code du guide (le dossier le donne) ; les numéros sont `partie-nnn` sur trois chiffres.

---

## 6. Correspondance avec le schéma Supabase du site

| JSON | Table.colonne |
|---|---|
| guide `code` / `slug` | `bases.slug` (+ colonne `code` à ajouter) |
| `document.ref` | `textes_sources.ref` |
| `document.titre_court` | `textes_sources.libelle` |
| `document.date_texte`, `statut` | `textes_sources.date_texte`, `statut` |
| `chunks[].content` concaténés | `textes_sources.texte` |
| `chunks[]` | table de morceaux de 002_assistant.sql (vectorisation) |
| paragraphe `id` « DOU-7-012 » | `paragraphes.base` = douane, `paragraphes.num` = « 7-012 » |
| paragraphe complet | `paragraphes.contenu` (jsonb) |
| `textes[]` | `citations` |
| `v`, `hist` | à ajouter : `paragraphes.version` + archive des versions |

---

## 7. Point bloquant constaté dans le dépôt LeRef

`scripts/montage.ts` refuse aujourd'hui tout identifiant qui ne correspond pas à `^\d+-\d{3}$`, et `scripts/chargement.ts` ne lit que les fichiers `PARTIE_*.json`. Les fichiers au nouveau format (`DOU-7-012`, `DOU_PARTIE_7_CH2.json`) seraient donc rejetés. Adaptation à faire (étape 3 de la feuille de route) :

1. accepter `^(CODE-)?\d+-\d{3}$`, vérifier que le préfixe et `g` égalent le `code` du guide, puis stocker `num` sans préfixe ;
2. lire `^(CODE_)?PARTIE_.*\.json$` ;
3. refuser un paragraphe dont `v` n'est pas supérieur à la version en base ; archiver l'ancienne ;
4. ajouter un mode `montage:sources` qui charge les SRC_*.json dans `textes_sources` et la table de morceaux.

---

## 8. L'aiguillage par LLM (étape ultérieure)

L'assistant n'invente rien : il ne répond qu'à partir de ce que la base lui renvoie.

1. **Choix du guide** : à partir de la question, classement sur les descriptions de `bases` (douane, changes, fiscalité…), plusieurs guides possibles.
2. **Recherche** dans les paragraphes de ces guides : plein texte (titres, enbref, textes cités) + similarité vectorielle sur `enbref`, `principe`, `faq`.
3. **Réponse** limitée aux paragraphes retrouvés, avec leurs numéros (« voir DOU-7-012 ») ; si besoin, l'extrait officiel est tiré de `textes_sources` via `citations`.
4. **Aucun paragraphe pertinent** : l'assistant le dit et oriente vers le sommaire ou un parcours, sans répondre de mémoire.

Ce qui rend cet aiguillage fiable dès maintenant : des titres explicites hors contexte, un `enbref` qui énonce la règle, des `textes` écrits selon le `titre_court` des sources, des `faq` formulées comme les opérateurs posent leurs questions.
