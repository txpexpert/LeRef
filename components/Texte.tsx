// Mise en forme d'un champ texte du guide : paragraphes, listes « - » ou « 1. »
export default function Texte({ valeur }: { valeur?: string | null }) {
  if (!valeur) return null;
  const blocs: { type: "p" | "ul" | "ol"; lignes: string[] }[] = [];
  for (const brute of valeur.split(/\n/)) {
    const l = brute.trim();
    if (!l) continue;
    const puce = l.match(/^[-–•]\s+(.*)$/), numero = l.match(/^\d+[.)]\s+(.*)$/);
    const type = puce ? "ul" : numero ? "ol" : "p";
    const contenu = puce?.[1] ?? numero?.[1] ?? l;
    const dernier = blocs[blocs.length - 1];
    if (type !== "p" && dernier?.type === type) dernier.lignes.push(contenu);
    else blocs.push({ type, lignes: [contenu] });
  }
  return (
    <>
      {blocs.map((b, i) =>
        b.type === "p" ? <p key={i}>{b.lignes[0]}</p>
        : b.type === "ul" ? <ul key={i}>{b.lignes.map((x, j) => <li key={j}>{x}</li>)}</ul>
        : <ol key={i}>{b.lignes.map((x, j) => <li key={j}>{x}</li>)}</ol>)}
    </>
  );
}
