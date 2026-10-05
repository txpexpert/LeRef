// Client Supabase avec la clé secrète : SERVEUR UNIQUEMENT.
// L'import de « server-only » fait échouer la compilation si ce fichier
// est importé par erreur dans un composant exécuté dans le navigateur.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !cle) throw new Error("Configuration Supabase manquante (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
    client = createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

export function dbConfiguree(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
