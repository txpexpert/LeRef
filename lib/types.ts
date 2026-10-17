// Format d'un paragraphe tel que produit par le projet de rédaction
export type Paragraphe = {
  id: string;            // ex. "7-012"
  p: number;             // partie
  ch: string;            // chapitre, ex. "7.2"
  c?: string;            // intitulé du chapitre
  t: string;             // titre
  enbref?: string;
  textes?: string[];
  principe?: string;
  admin?: string;
  donnees?: [string, string][];
  cas?: string;
  juris?: string;
  conseil?: string;
  faq?: [string, string][];
  renvois?: string[];
  maj?: string;          // AAAA-MM-JJ
  verif?: "oui" | "partiel" | "non";
  balises?: string[];
  mod?: boolean;
  hist?: string[];
};

export type Parcours = {
  id: string;
  titre: string;
  description?: string;
  etapes: string[];
  gratuit?: boolean;
};

// Pages liminaires d'un guide (content/<guide>/liminaires.json)
export type Liminaires = {
  titre?: string;
  sous_titre?: string;
  edition?: string;          // ex. "Édition 2026"
  a_jour_au?: string;        // AAAA-MM-JJ
  accroche?: string;
  avertissement?: string[];
  mode_emploi?: { introduction?: string[]; rubriques?: { rubrique: string; texte: string }[]; conclusion?: string[] };
  abreviations?: [string, string][];
};

// Logigramme inséré dans un paragraphe (content/<guide>/logigrammes.json + figures/)
export type Logigramme = {
  num: number;
  titre: string;
  sources?: string;
  paragraphe: string;        // ex. "3-033"
  fichier: string;           // ex. "figure-02.webp", dans content/<guide>/figures/
  largeur?: number;
  hauteur?: number;
};

// Modèle d'acte (content/<guide>/modeles.json)
export type ModeleActe = {
  code: string;              // ex. "M1"
  titre: string;
  usage?: string;
  textes?: string[];
  corps: string[];
  pieces?: string[];
  vigilance?: string[];
  renvois?: string[];
  figures?: number[];
};

export type BaseConfig = {
  slug: string;
  code?: string;         // code du guide (DOU, FISC…) : préfixe accepté dans les numéros « DOU-7-012 »
  titre: string;
  sous_titre?: string;
  description?: string;
  ordre?: number;
  publie?: boolean;
  gratuits?: string[];
};
