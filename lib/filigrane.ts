// Filigrane invisible : une empreinte propre à chaque abonné est glissée dans
// le texte sous forme de caractères de largeur nulle. Elle survit au
// copier-coller ; un texte retrouvé ailleurs permet d'identifier le compte
// d'origine (page Administration › Identifier une copie).

const ZERO = "​";   // espace de largeur nulle
const UN = "‌";     // anti-liant de largeur nulle
const BORNE = "⁠";  // gluon de mots

export function codeUtilisateur(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 8); // 32 bits
}

export function empreinte(code: string): string {
  const bits = parseInt(code, 16).toString(2).padStart(32, "0");
  return BORNE + [...bits].map((b) => (b === "1" ? UN : ZERO)).join("") + BORNE;
}

// Insère l'empreinte après la première phrase (ou à la fin si le texte est court)
export function filigraner(texte: string | undefined, code: string): string {
  if (!texte) return "";
  const e = empreinte(code);
  const i = texte.search(/[.;:]\s/);
  return i > 0 ? texte.slice(0, i + 1) + e + texte.slice(i + 1) : texte + e;
}

// Retrouve les codes présents dans un texte copié
export function lireEmpreintes(texte: string): string[] {
  const re = new RegExp(`${BORNE}([${ZERO}${UN}]{32})${BORNE}`, "g");
  const codes = new Set<string>();
  for (const m of texte.matchAll(re)) {
    const bits = [...m[1]].map((c) => (c === UN ? "1" : "0")).join("");
    codes.add(parseInt(bits, 2).toString(16).padStart(8, "0"));
  }
  return [...codes];
}
