import FormulaireFiligrane from "@/components/FormulaireFiligrane";

export const metadata = { title: "Identifier une copie" };

export default function Filigrane() {
  return (
    <div className="pile">
      <h1 style={{ fontSize: "1.7rem" }}>Identifier l&apos;origine d&apos;une copie</h1>
      <p className="muet" style={{ margin: 0 }}>
        Chaque paragraphe affiché contient une empreinte invisible propre au compte qui le consulte. Collez ci-dessous un texte retrouvé
        à l&apos;extérieur (site, document, message) : le compte d&apos;origine s&apos;affiche si l&apos;empreinte a été conservée.
      </p>
      <FormulaireFiligrane />
    </div>
  );
}
