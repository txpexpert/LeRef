"use client";
// À chaque copie : le texte est limité en longueur et la source est ajoutée.
import { useEffect } from "react";

export default function ProtectionCopie({ source, abonne, max }: { source: string; abonne: string; max: number }) {
  useEffect(() => {
    const surCopie = (e: ClipboardEvent) => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !e.clipboardData) return;
      let texte = sel.toString();
      let note = "";
      if (texte.length > max) {
        texte = texte.slice(0, max) + " […]";
        note = " Extrait limité : la reproduction intégrale est réservée à la consultation en ligne.";
      }
      e.clipboardData.setData("text/plain", `${texte}\n\n— ${source}. Copie à usage interne de ${abonne}.${note}`);
      e.preventDefault();
    };
    document.addEventListener("copy", surCopie);
    return () => document.removeEventListener("copy", surCopie);
  }, [source, abonne, max]);
  return null;
}
