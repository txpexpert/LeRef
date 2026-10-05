// Filigrane visible : nom de l'abonné, organisation et date répétés en fond.
export default function Filigrane({ texte }: { texte: string }) {
  const positions: { top: string; left: string }[] = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 3; c++)
    positions.push({ top: `${r * 12 + 4}%`, left: `${c * 36 - 6 + (r % 2) * 14}%` });
  return (
    <div className="filigrane" aria-hidden="true">
      {positions.map((p, i) => <span key={i} style={p}>{texte}</span>)}
    </div>
  );
}
