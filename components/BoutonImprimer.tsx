"use client";
export default function BoutonImprimer() {
  return <button className="btn" type="button" onClick={() => window.print()}>Imprimer / PDF</button>;
}
