// Mise en forme d'un champ texte du guide :
//   paragraphes · listes « - » ou « 1. » · sous-titres « ### Titre » ·
//   tableaux en lignes « | a | b | c | » (la première ligne sert d'en-tête)
type Bloc =
  | { type: "p" | "h"; lignes: string[] }
  | { type: "ul" | "ol"; lignes: string[] }
  | { type: "table"; lignes: string[][] };

const cellules = (l: string) => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

export default function Texte({ valeur }: { valeur?: string | null }) {
  if (!valeur) return null;
  const blocs: Bloc[] = [];
  for (const brute of valeur.split(/\n/)) {
    const l = brute.trim();
    if (!l) continue;
    const dernier = blocs[blocs.length - 1];
    if (/^\|.*\|$/.test(l)) {
      if (dernier?.type === "table") dernier.lignes.push(cellules(l));
      else blocs.push({ type: "table", lignes: [cellules(l)] });
      continue;
    }
    const titre = l.match(/^#{2,4}\s+(.*)$/);
    if (titre) { blocs.push({ type: "h", lignes: [titre[1]] }); continue; }
    const puce = l.match(/^[-–•]\s+(.*)$/), numero = l.match(/^\d+[.)]\s+(.*)$/);
    const type = puce ? "ul" : numero ? "ol" : "p";
    const contenu = puce?.[1] ?? numero?.[1] ?? l;
    if (type !== "p" && dernier?.type === type) dernier.lignes.push(contenu);
    else blocs.push({ type, lignes: [contenu] } as Bloc);
  }
  return (
    <>
      {blocs.map((b, i) => {
        if (b.type === "table") {
          const [entete, ...corps] = b.lignes;
          const n = Math.max(...b.lignes.map((r) => r.length));
          const plein = (r: string[]) => [...r, ...Array(n - r.length).fill("")];
          return (
            <div key={i} className="defile tableau-texte">
              <table className="donnees">
                {corps.length > 0 && <thead><tr>{plein(entete).map((c, j) => <th key={j}>{c}</th>)}</tr></thead>}
                <tbody>{(corps.length ? corps : [entete]).map((r, k) => <tr key={k}>{plein(r).map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        if (b.type === "h") return <p key={i} className="sous-titre">{b.lignes[0]}</p>;
        if (b.type === "p") return <p key={i}>{b.lignes[0]}</p>;
        return b.type === "ul"
          ? <ul key={i}>{b.lignes.map((x, j) => <li key={j}>{x}</li>)}</ul>
          : <ol key={i}>{b.lignes.map((x, j) => <li key={j}>{x}</li>)}</ol>;
      })}
    </>
  );
}
