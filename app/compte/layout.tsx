import MenuLateral from "@/components/MenuLateral";
import { exigerConnexion } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LayoutCompte({ children }: { children: React.ReactNode }) {
  const c = await exigerConnexion();
  const liens: [string, string][] = [
    ["/compte", "Tableau de bord"],
    ["/compte/favoris", "Favoris et suivis"],
    ["/compte/abonnement", "Abonnement"],
    ["/compte/factures", "Factures"],
  ];
  if (c.profil.role_org === "gestionnaire") liens.push(["/compte/membres", "Utilisateurs"]);
  liens.push(["/mot-de-passe/nouveau", "Mot de passe"]);
  return (
    <div className="compte">
      <MenuLateral liens={liens} />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
