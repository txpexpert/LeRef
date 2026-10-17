// En-têtes de sécurité et règles de cache.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join("; ");

const securite = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// Pages réservées : jamais mises en cache, jamais indexées
const prive = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  // Import direct (Administration › Importer) : fichiers JSON et images des logigrammes.
  // Vercel limite une requête à 4,5 Mo ; la page découpe les envois en lots de 3,5 Mo.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [
      { source: "/:path*", headers: securite },
      { source: "/:base/p/:num*", headers: prive },
      { source: "/:base/recherche", headers: prive },
      { source: "/:base/textes/:ref*", headers: prive },
      { source: "/:base/textes", headers: prive },
      { source: "/:base/modeles/:code*", headers: prive },
      { source: "/:base/figures/:num*", headers: prive },
      { source: "/compte/:path*", headers: prive },
      { source: "/admin/:path*", headers: prive },
    ];
  },
};
