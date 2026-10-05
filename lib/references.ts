// Normalisation des références citées dans le champ « textes » d'un paragraphe.
// Une même source peut être écrite de plusieurs façons ; on en tire une clé
// stable (ex. « circ-6164-313 ») qui sert aux liens vers le texte source,
// à la liste « paragraphes qui citent ce texte » et à l'analyse d'impact.

function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function slug(s: string): string {
  return sansAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function normaliserReference(libelle: string): string {
  const s = sansAccents(libelle).toLowerCase();

  // Circulaires et notes ADII : « circulaire n° 6164/313 », « note n° D885/21/ADII/100 »
  const circ = s.match(/\b(circulaire|circ\.?|note)\b[^0-9a-z]*(?:adii\s*)?(?:n[°o]\.?\s*)?([a-z]?\d[\w/.-]*)/i);
  if (circ) {
    const type = circ[1].startsWith("note") ? "note" : "circ";
    return `${type}-${slug(circ[2])}`;
  }

  // Code des douanes et impôts indirects : « CDII, art. 116-2° »
  const cdii = s.match(/\bcdii\b.*?\bart(?:icle)?s?\.?\s*(\d+(?:\s*(?:bis|ter|quater|quinquies))?)/);
  if (cdii) return `cdii-art-${slug(cdii[1])}`;
  if (/\bcdii\b/.test(s)) return "cdii";

  // Décrets, arrêtés, lois, dahirs : « Décret n° 2-77-862 », « loi n° 13-89 »
  const texte = s.match(/\b(decret|arrete|loi|dahir)\b[^0-9]*(?:n[°o]\.?\s*)?(\d[\d.-]*\d)/);
  if (texte) return `${texte[1]}-${slug(texte[2])}`;

  // Lois de finances : « LF 2023 », « loi de finances 2025 »
  const lf = s.match(/\b(?:lf|loi de finances)\s*(?:pour l'annee\s*)?(\d{4})/);
  if (lf) return `lf-${lf[1]}`;

  return slug(libelle);
}

// Rubriques de la table des textes cités (même découpage que l'édition imprimée)
export const RUBRIQUES_TEXTES = [
  "Code des douanes et impôts indirects",
  "Lois, dahirs et lois de finances",
  "Décrets",
  "Arrêtés",
  "Circulaires et notes de l'ADII",
  "Conventions et accords internationaux",
  "Code général des impôts",
  "Autres textes",
] as const;

export function rubriqueTexte(libelle: string): (typeof RUBRIQUES_TEXTES)[number] {
  const s = sansAccents(libelle).toLowerCase();
  if (/^(cgi|code general des impots)\b/.test(s)) return "Code général des impôts";
  if (/^(cdii|code des douanes)\b/.test(s)) return "Code des douanes et impôts indirects";
  if (/^(circulaires?|circ\.?|notes?|instructions?|lettres?|decisions?|brochure|guide adii|guides adii)\b/.test(s)) return "Circulaires et notes de l'ADII";
  if (/^decret/.test(s)) return "Décrets";
  if (/^arrete/.test(s)) return "Arrêtés";
  if (/^(dahir|loi|lf\b)/.test(s)) return "Lois, dahirs et lois de finances";
  if (/^(convention|accord|protocole|traite|reglement|systeme harmonise|annexe|wco|omc|omd|acte)/.test(s)) return "Conventions et accords internationaux";
  return "Autres textes";
}
