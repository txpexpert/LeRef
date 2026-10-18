// Données de démonstration : comptes, formules, clients, factures, surveillance.
// Tout est fictif (entreprises, personnes, montants, références de virement).
window.DEMO = {
  site: { nom: "Guides pratiques — Maroc", signature: "Référentiels professionnels pour les opérateurs du commerce international", essai: 7 },
  emetteur: {
    raison: "Structura Capital Investments", forme: "SARL", adresse: "Adresse à compléter", ville: "Casablanca",
    ice: "000000000000000", rc: "RC à compléter", if: "IF à compléter", banque: "Banque à compléter",
    rib: "000 000 0000000000000000 00", email: "facturation@exemple.ma",
  },
  comptes: {
    abonne: { id: "9f3a01bc", nom: "Karim Alami", email: "k.alami@transit-atlas.ma", org: "Transit Atlas SARL", role: "gestionnaire" },
    admin: { id: "11111111", nom: "Administrateur", email: "admin@exemple.ma", org: "Structura Capital Investments", role: "admin" },
  },
  organisation: {
    raison: "Transit Atlas SARL", ice: "001122334455667", rc: "RC 412233", adresse: "12, boulevard Zerktouni",
    ville: "Casablanca", email: "compta@transit-atlas.ma", tel: "05 22 00 00 00",
  },
  // Prix d'exemple pour la démonstration : à fixer dans la table « plans »
  plans: [
    { code: "douane-solo", nom: "Douane — Individuel", desc: "Un utilisateur, guide des procédures douanières.", bases: "Guide des procédures douanières", sieges: 1, mois: 12, ht: 4800 },
    { code: "douane-equipe", nom: "Douane — Équipe 5", desc: "Cinq utilisateurs nommés, même organisation.", bases: "Guide des procédures douanières", sieges: 5, mois: 12, ht: 14400, avant: true },
    { code: "tous-entreprise", nom: "Tous les guides — Entreprise", desc: "Dix utilisateurs, tous les guides publiés.", bases: "Tous les guides", sieges: 10, mois: 12, ht: 36000 },
  ],
  abonnement: { plan: "douane-equipe", statut: "actif", debut: -30, fin: 335 },   // jours relatifs à aujourd'hui
  historique: [
    { plan: "Essai gratuit 7 jours", statut: "essai", debut: -38, fin: -31 },
    { plan: "Douane — Équipe 5", statut: "actif", debut: -30, fin: 335 },
  ],
  membres: [
    { nom: "Karim Alami", email: "k.alami@transit-atlas.ma", role: "gestionnaire", depuis: -38 },
    { nom: "Leila Haddad", email: "l.haddad@transit-atlas.ma", role: "membre", depuis: -29 },
    { nom: "Youssef Tazi", email: "y.tazi@transit-atlas.ma", role: "membre", depuis: -12 },
  ],
  factures: [
    { id: "FA-2026-0007", proforma: "PF-2026-0009", statut: "payee", date: -30, payee: -30, virement: "VIR-0904-ATL-552", plan: "douane-equipe",
      client: { raison: "Transit Atlas SARL", ice: "001122334455667", adresse: "12, boulevard Zerktouni", ville: "Casablanca" } },
  ],
  enAttente: [
    { id: "PF-2026-0014", date: -3, plan: "douane-solo", client: { raison: "Import Sud SARL", ice: "009988776655443", adresse: "Zone industrielle", ville: "Agadir" } },
    { id: "PF-2026-0015", date: -1, plan: "tous-entreprise", client: { raison: "Cabinet Benali Conseil", ice: "002233445566778", adresse: "Rue Ibn Toumert", ville: "Rabat" } },
  ],
  clients: [
    { raison: "Transit Atlas SARL", ice: "001122334455667", ville: "Casablanca", users: 3, plan: "douane-equipe", statut: "actif", fin: 335, depuis: -38 },
    { raison: "Import Sud SARL", ice: "009988776655443", ville: "Agadir", users: 1, plan: "essai", statut: "essai", fin: 4, depuis: -3 },
    { raison: "Cabinet Benali Conseil", ice: "002233445566778", ville: "Rabat", users: 1, plan: "essai", statut: "essai", fin: 6, depuis: -1 },
    { raison: "Logistique Nord SA", ice: "003344556677889", ville: "Tanger", users: 5, plan: "douane-equipe", statut: "actif", fin: 210, depuis: -155 },
    { raison: "Atlas Câblage SARL", ice: "004455667788990", ville: "Kénitra", users: 1, plan: "douane-solo", statut: "suspendu", fin: 120, depuis: -245 },
  ],
  surveillance: [
    { nom: "compte-test-7781", email: "contact7781@mail-temp.net", org: "Atlas Câblage SARL", lectures: 412, distincts: 398, seq: 94, de: "02:11", a: "03:47" },
    { nom: "Karim Alami", email: "k.alami@transit-atlas.ma", org: "Transit Atlas SARL", lectures: 23, distincts: 17, seq: 12, de: "08:42", a: "17:05" },
    { nom: "Leila Haddad", email: "l.haddad@transit-atlas.ma", org: "Transit Atlas SARL", lectures: 15, distincts: 11, seq: 20, de: "09:10", a: "16:30" },
    { nom: "Hamza Idrissi", email: "h.idrissi@logistique-nord.ma", org: "Logistique Nord SA", lectures: 31, distincts: 26, seq: 8, de: "08:05", a: "18:22" },
  ],
  montages: [
    { quand: 0, base: "douane", paras: 7, prevus: 142, erreurs: 0, balises: 11, enrichir: 7,
      avert: ["7-005, 7-006, 7-007 : paragraphes ajoutés hors plan (à reporter dans le plan)"] },
  ],
};
