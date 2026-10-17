import MenuLateral from "@/components/MenuLateral";
import { exigerAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await exigerAdmin();
  return (
    <div className="compte">
      <MenuLateral liens={[
        ["/admin", "Vue d'ensemble"], ["/admin/paiements", "Paiements"], ["/admin/clients", "Clients"],
        ["/admin/surveillance", "Surveillance"], ["/admin/importer", "Importer des fichiers"], ["/admin/montages", "Montages"], ["/admin/filigrane", "Identifier une copie"],
      ]} />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
