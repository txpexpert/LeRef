"use client";
// Contrôle anti-robots affiché seulement si la clé publique Turnstile est configurée.
import Script from "next/script";

export default function Turnstile() {
  const cle = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!cle) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={cle} data-language="fr" />
    </>
  );
}
