export function dateFr(d?: string | Date | null): string {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d.length === 10 ? d + "T12:00:00" : d) : d;
  return x.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function dateLongue(d?: string | Date | null): string {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d.length === 10 ? d + "T12:00:00" : d) : d;
  return x.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function mad(n?: number | string | null): string {
  if (n === null || n === undefined || n === "") return "—";
  return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";
}

const UNITES = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
  "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const DIZAINES = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function moinsDeCent(n: number): string {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10), u = n % 10;
  if (d === 7 || d === 9) {
    const reste = 10 + u;
    return DIZAINES[d] + (d === 7 && u === 1 ? "-et-" : "-") + UNITES[reste];
  }
  if (u === 0) return DIZAINES[d] + (d === 8 ? "s" : "");
  return DIZAINES[d] + (u === 1 && d !== 8 ? "-et-" : "-") + UNITES[u];
}

function moinsDeMille(n: number): string {
  const c = Math.floor(n / 100), r = n % 100;
  let s = "";
  if (c > 1) s = UNITES[c] + " cent" + (r === 0 ? "s" : "");
  else if (c === 1) s = "cent";
  if (r) s += (s ? " " : "") + moinsDeCent(r);
  return s;
}

function entierEnLettres(n: number): string {
  if (n === 0) return "zéro";
  const parts: string[] = [];
  const milliards = Math.floor(n / 1e9), millions = Math.floor((n % 1e9) / 1e6),
    milliers = Math.floor((n % 1e6) / 1000), reste = n % 1000;
  if (milliards) parts.push(moinsDeMille(milliards) + " milliard" + (milliards > 1 ? "s" : ""));
  if (millions) parts.push(moinsDeMille(millions) + " million" + (millions > 1 ? "s" : ""));
  if (milliers) parts.push(milliers === 1 ? "mille" : moinsDeMille(milliers).replace(/cents$/, "cent") + " mille");
  if (reste) parts.push(moinsDeMille(reste));
  return parts.join(" ");
}

// « Arrêtée la présente facture à la somme de … »
export function montantEnLettres(montant: number): string {
  const entier = Math.floor(montant + 1e-9);
  const cts = Math.round((montant - entier) * 100);
  const de = entier >= 1e6 && entier % 1e6 === 0 ? " de" : "";
  let s = entierEnLettres(entier) + de + " dirham" + (entier > 1 ? "s" : "");
  if (cts) s += " et " + entierEnLettres(cts) + " centime" + (cts > 1 ? "s" : "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
