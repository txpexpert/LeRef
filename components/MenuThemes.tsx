"use client";
// Liste déroulante « Choisir votre thème » (en-tête) : un lien par dossier disponible,
// les autres sont listés grisés (« Bientôt »). Se ferme au clic extérieur ou avec Échap.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type ThemeMenu = { slug: string; court: string; titre: string; href: string | null };

export default function MenuThemes({ themes }: { themes: ThemeMenu[] }) {
  const [ouvert, setOuvert] = useState(false);
  const racine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => { if (!racine.current?.contains(e.target as Node)) setOuvert(false); };
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => { document.removeEventListener("mousedown", clic); document.removeEventListener("keydown", touche); };
  }, [ouvert]);

  return (
    <div className="menu-themes" ref={racine}>
      <button type="button" className="menu-themes-btn" aria-expanded={ouvert} aria-haspopup="true" onClick={() => setOuvert((o) => !o)}>
        Choisir votre thème <span aria-hidden="true">▾</span>
      </button>
      {ouvert && (
        <ul className="menu-themes-liste">
          {themes.map((t) => (
            <li key={t.slug}>
              {t.href
                ? <Link href={t.href} title={t.titre} onClick={() => setOuvert(false)}>{t.court}</Link>
                : <span className="off" title={`${t.titre} — prochainement`}>{t.court}<em>Bientôt</em></span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
