import Link from "next/link";
export default function Introuvable() {
  return (
    <div className="carte" style={{ maxWidth: 560, margin: "40px auto" }}>
      <h1 style={{ fontSize: "1.6rem", marginBottom: 8 }}>Page introuvable</h1>
      <p className="muet">Cette adresse ne correspond à aucune page. Le paragraphe a peut-être été renuméroté ou retiré.</p>
      <Link className="btn" href="/">Retour à l&apos;accueil</Link>
    </div>
  );
}
