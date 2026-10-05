import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./supabase/admin";
import { COOKIE_SESSION } from "./session";

// Enregistre la nouvelle session comme la seule autorisée pour ce compte :
// toute session ouverte ailleurs est fermée à sa prochaine requête.
export async function ouvrirSession(userId: string) {
  const jeton = randomUUID();
  await db().from("profils").update({ session_active: jeton }).eq("id", userId);
  cookies().set(COOKIE_SESSION, jeton, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
}
