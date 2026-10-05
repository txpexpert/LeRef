"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/admin";
import { contexte } from "@/lib/session";

async function basculer(table: "favoris" | "suivis", base: string, num: string) {
  const c = await contexte();
  if (c.etat !== "connecte") return;
  const cle = { user_id: c.profil.id, base, num };
  const { data } = await db().from(table).select("num").match(cle).maybeSingle();
  if (data) await db().from(table).delete().match(cle);
  else await db().from(table).insert(cle);
  revalidatePath(`/${base}/p/${num}`);
}

export async function basculerFavori(base: string, num: string) { await basculer("favoris", base, num); }
export async function basculerSuivi(base: string, num: string) { await basculer("suivis", base, num); }
