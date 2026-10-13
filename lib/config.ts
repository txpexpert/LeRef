// Paramètres généraux de la plateforme (modifiables ici ou par variables d'environnement)
export const SITE = {
  nom: "Guides pratiques — Maroc",
  signature: "Référentiels professionnels pour les opérateurs du commerce international",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  contact: process.env.FACTURE_EMAIL ?? "contact@exemple.ma",
  // Les inscriptions avec ces domaines sont refusées (cible : secteur privé)
  domainesRefuses: ["gov.ma"],
  essaiJours: 7,
  // Carte « Prochainement » sur la page d'accueil tant que tous les guides ne sont pas publiés
  guidesPrevus: 11,
  // Copie : longueur maximale copiée en une fois, au-delà le texte est tronqué
  copieMax: 1500,
};

export const EMETTEUR = {
  raisonSociale: process.env.FACTURE_RAISON_SOCIALE ?? "Raison sociale à compléter",
  forme: process.env.FACTURE_FORME ?? "",
  adresse: process.env.FACTURE_ADRESSE ?? "",
  ville: process.env.FACTURE_VILLE ?? "",
  ice: process.env.FACTURE_ICE ?? "",
  rc: process.env.FACTURE_RC ?? "",
  if: process.env.FACTURE_IF ?? "",
  tp: process.env.FACTURE_TP ?? "",
  banque: process.env.FACTURE_BANQUE ?? "",
  rib: process.env.FACTURE_RIB ?? "",
  email: process.env.FACTURE_EMAIL ?? "",
  tauxTva: 20,
};
