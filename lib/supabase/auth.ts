// Client d'authentification (clé publique) : il ne sert qu'à gérer la session
// de l'utilisateur via des cookies. Il n'interroge jamais les tables.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function authClient() {
  const magasin = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => magasin.getAll(),
        setAll: (liste) => {
          try {
            for (const { name, value, options } of liste) magasin.set(name, value, options);
          } catch {
            // Appel depuis un composant serveur : le middleware rafraîchit la session.
          }
        },
      },
    },
  );
}
