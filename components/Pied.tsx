import Link from "next/link";
import { SITE, EMETTEUR } from "@/lib/config";

export default function Pied() {
  return (
    <footer className="pied">
      <div className="conteneur">
        <div>
          <b style={{ color: "#fff" }}>{SITE.nom}</b>
          <div>Édité par {EMETTEUR.raisonSociale}. Contenus protégés : reproduction et extraction interdites.</div>
        </div>
        <nav aria-label="Informations légales">
          <Link href="/legal/cgu">Conditions générales</Link>
          <Link href="/legal/confidentialite">Confidentialité</Link>
          <Link href="/legal/mentions">Mentions légales</Link>
          <Link href="/tarifs">Tarifs</Link>
        </nav>
      </div>
    </footer>
  );
}
