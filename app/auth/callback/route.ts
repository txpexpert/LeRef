// Retour des liens envoyés par e-mail (confirmation d'inscription, réinitialisation)
import { NextResponse, type NextRequest } from "next/server";
import { authClient } from "@/lib/supabase/auth";
import { ouvrirSession } from "@/lib/ouverture";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const suite = req.nextUrl.searchParams.get("suite") ?? "/compte";
  const cible = suite.startsWith("/") && !suite.startsWith("//") ? suite : "/compte";
  if (code) {
    const { data, error } = await authClient().auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await ouvrirSession(data.user.id);
      return NextResponse.redirect(new URL(cible, req.url));
    }
  }
  return NextResponse.redirect(new URL("/connexion?raison=expiree", req.url));
}
