import Link from "next/link";
import { contexte } from "@/lib/session";
import { listeBases } from "@/lib/contenu";
import { SITE } from "@/lib/config";
import { modeLocal } from "@/lib/local";

export default async function Entete() {
  const [c, bases] = await Promise.all([contexte(), listeBases()]);
  const connecte = c.etat === "connecte";
  const local = modeLocal();
  return (
    <>
      <div className="bandeau">
        <div className="conteneur">
          <span>{SITE.signature}</span>
          <span>
            {local ? <b>Version locale : contenu lu depuis le dossier content/ · comptes et abonnements désactivés</b>
              : connecte && c.actif ? <>{c.actif.statut === "essai" ? "Essai gratuit" : "Abonnement actif"} jusqu&apos;au {new Date(c.actif.fin! + "T12:00:00").toLocaleDateString("fr-FR")}</>
              : connecte ? (c.profil.est_admin ? "Administrateur" : <Link href="/compte/abonnement">Choisir une formule</Link>)
              : <Link href="/inscription">Essai gratuit de {SITE.essaiJours} jours</Link>}
          </span>
        </div>
      </div>
      <header className="entete">
        <div className="conteneur">
          <Link className="marque" href="/">
            <span className="sceau" aria-hidden="true">GP</span>
            <span><b>{SITE.nom}</b><small>Procédures et réglementation</small></span>
          </Link>
          <nav className="nav" aria-label="Guides">
            {bases.map((b) => <Link key={b.slug} href={`/${b.slug}`}>{b.titre.replace(/^Guide des? /i, "").replace(/^./, (x) => x.toUpperCase())}</Link>)}
            <Link href="/tarifs">Tarifs</Link>
          </nav>
          <div className="droite">
            {local ? <span className="badge info">Version locale</span> : connecte ? (
              <>
                {c.profil.est_admin && <Link className="btn secondaire petit" href="/admin">Administration</Link>}
                <Link className="btn secondaire petit" href="/compte">{c.profil.nom || c.profil.email}</Link>
                <a className="btn secondaire petit" href="/deconnexion">Se déconnecter</a>
              </>
            ) : (
              <>
                <Link className="btn secondaire petit" href="/connexion">Se connecter</Link>
                <Link className="btn petit" href="/inscription">Essai gratuit</Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
