import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { authClient } from "@/lib/supabase/auth";
import { db } from "@/lib/supabase/admin";
import { COOKIE_SESSION } from "@/lib/session";

export async function GET(req: NextRequest) {
  const raison = req.nextUrl.searchParams.get("raison");
  const jeton = cookies().get(COOKIE_SESSION)?.value;
  const supabase = authClient();
  const { data } = await supabase.auth.getUser();
  // On ne libère la session enregistrée que si c'est bien celle de cet appareil
  if (data.user && jeton)
    await db().from("profils").update({ session_active: null }).eq("id", data.user.id).eq("session_active", jeton);
  await supabase.auth.signOut({ scope: "local" });
  cookies().delete(COOKIE_SESSION);
  return NextResponse.redirect(new URL(raison ? `/connexion?raison=${raison}` : "/", req.url));
}
