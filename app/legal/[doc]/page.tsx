import { notFound } from "next/navigation";
import { SITE, EMETTEUR } from "@/lib/config";

// Textes de base à faire relire par un juriste avant la mise en ligne.
const DOCS: Record<string, { titre: string; sections: [string, string][] }> = {
  cgu: {
    titre: "Conditions générales d'utilisation et d'abonnement",
    sections: [
      ["Objet", `Les présentes conditions régissent l'accès aux guides publiés sur ${SITE.nom}, édités par ${EMETTEUR.raisonSociale}.`],
      ["Accès réservé", "Le service est réservé aux entreprises et professionnels du secteur privé. Chaque accès est nominatif ; les identifiants ne peuvent être ni partagés ni cédés. Une seule session peut être ouverte à la fois par compte."],
      ["Propriété intellectuelle", "Les guides, leur structure, leur numérotation et leurs contenus sont des œuvres protégées. Sont interdits : l'extraction ou la réutilisation de tout ou partie substantielle des contenus, leur reproduction en dehors d'un usage interne, leur revente, ainsi que toute collecte automatisée (robots, scripts, aspiration de pages) ou utilisation pour entraîner un système d'intelligence artificielle."],
      ["Mesures de protection", "Les consultations sont journalisées. Des limites de consultation par heure et par jour s'appliquent. Les contenus affichés comportent un marquage permettant d'identifier le compte d'origine. Tout usage anormal peut entraîner la suspension de l'accès, sans préjudice de poursuites."],
      ["Abonnement et paiement", "L'abonnement est souscrit pour la durée indiquée dans la formule. Une facture proforma est émise à la souscription ; l'accès est activé à réception du virement. La facture définitive est disponible dans l'espace client."],
      ["Responsabilité", "Les guides constituent une aide à la compréhension de la réglementation. Ils ne remplacent ni les textes officiels ni un conseil adapté à une situation particulière."],
    ],
  },
  confidentialite: {
    titre: "Politique de confidentialité",
    sections: [
      ["Responsable du traitement", `${EMETTEUR.raisonSociale}, ${EMETTEUR.adresse} ${EMETTEUR.ville}.`],
      ["Données traitées", "Identité et coordonnées professionnelles, données de facturation, journal des consultations (date, paragraphe consulté, adresse IP, navigateur)."],
      ["Finalités", "Gestion des comptes et abonnements, facturation, sécurité du service et protection des contenus contre l'extraction."],
      ["Durée de conservation", "Données de compte : durée de l'abonnement et trois ans après. Journal des consultations : douze mois. Données de facturation : durée légale."],
      ["Vos droits", "Conformément à la loi n° 09-08, vous disposez d'un droit d'accès, de rectification et d'opposition, à exercer auprès de " + EMETTEUR.email + "."],
    ],
  },
  mentions: {
    titre: "Mentions légales",
    sections: [
      ["Éditeur", `${EMETTEUR.raisonSociale} ${EMETTEUR.forme} — ${EMETTEUR.adresse} ${EMETTEUR.ville} — ICE ${EMETTEUR.ice}${EMETTEUR.rc ? " — RC " + EMETTEUR.rc : ""}.`],
      ["Hébergement", "Application hébergée par Vercel Inc. ; base de données hébergée par Supabase Inc."],
      ["Contact", EMETTEUR.email],
    ],
  },
};

export function generateStaticParams() { return Object.keys(DOCS).map((doc) => ({ doc })); }

export default function Legal({ params }: { params: { doc: string } }) {
  const d = DOCS[params.doc];
  if (!d) notFound();
  return (
    <article className="carte" style={{ maxWidth: 820, margin: "0 auto", padding: "30px 36px" }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: 18 }}>{d.titre}</h1>
      {d.sections.map(([t, c]) => (
        <section key={t} style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: 4 }}>{t}</h2>
          <p style={{ margin: 0 }}>{c}</p>
        </section>
      ))}
    </article>
  );
}
