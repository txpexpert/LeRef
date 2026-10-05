import { notFound } from "next/navigation";
import { exigerConnexion } from "@/lib/session";
import { db } from "@/lib/supabase/admin";
import DocumentFacture from "@/components/DocumentFacture";

export const metadata = { title: "Facture" };

export default async function Facture({ params }: { params: { id: string } }) {
  const c = await exigerConnexion(`/compte/factures/${params.id}`);
  const { data: f } = await db().from("factures").select("*").eq("id", params.id).maybeSingle();
  if (!f || (!c.profil.est_admin && f.organisation_id !== c.profil.organisation_id)) notFound();
  return <DocumentFacture f={f} />;
}
