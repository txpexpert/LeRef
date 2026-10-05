import Link from "next/link";

const MESSAGES = {
  anonyme: ["Contenu réservé aux abonnés", "Connectez-vous ou démarrez un essai gratuit pour consulter ce paragraphe."],
  sans_abonnement: ["Aucun abonnement actif", "Votre essai ou votre abonnement est terminé. Choisissez une formule pour retrouver l'accès."],
  guide_non_inclus: ["Guide non inclus dans votre formule", "Votre abonnement ne couvre pas ce guide. Passez à une formule qui l'inclut."],
  bloque: ["Accès temporairement suspendu", "Une activité inhabituelle a été détectée sur votre compte. Contactez-nous pour rétablir l'accès."],
  autre_session: ["Session fermée", "Votre compte est ouvert sur un autre appareil."],
} as const;

export default function AccesRefuse({ raison, retour }: { raison: keyof typeof MESSAGES; retour: string }) {
  const [titre, texte] = MESSAGES[raison];
  return (
    <div className="message info" style={{ display: "grid", gap: 10, padding: 18 }}>
      <b style={{ fontSize: "1.05rem" }}>{titre}</b>
      <span>{texte}</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {raison === "anonyme" ? (
          <>
            <Link className="btn" href={`/connexion?retour=${encodeURIComponent(retour)}`}>Se connecter</Link>
            <Link className="btn secondaire" href="/inscription">Essai gratuit</Link>
          </>
        ) : <Link className="btn" href="/tarifs">Voir les formules</Link>}
      </div>
    </div>
  );
}
