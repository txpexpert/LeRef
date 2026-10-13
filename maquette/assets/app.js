/* =====================================================================
   Démonstration HTML de la plateforme — même interface que le site réel.
   Les protections (accès, filigranes, copie limitée) sont simulées ici ;
   sur le site réel, elles sont appliquées par le serveur.
   ===================================================================== */
(function () {
const C = window.CONTENU, D = window.DEMO;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const params = new URLSearchParams(location.search);
const page = document.body.dataset.page;

/* ---------- état de la démonstration ---------- */
const lire = (k, d) => { try { const v = localStorage.getItem("demo-" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const ecrire = (k, v) => { try { localStorage.setItem("demo-" + k, JSON.stringify(v)); } catch (e) {} };
let mode = lire("mode", "visiteur");
const connecte = mode !== "visiteur", admin = mode === "admin";
const compte = connecte ? D.comptes[mode === "admin" ? "admin" : "abonne"] : null;

/* ---------- dates et montants ---------- */
const jour = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const dfr = (d) => (typeof d === "number" ? jour(d) : typeof d === "string" ? new Date(d + "T12:00:00") : d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dlong = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const mad = (n) => Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";
const ttc = (ht) => Math.round(ht * 1.2 * 100) / 100;

const U = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const DZ = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];
function c100(n) { if (n < 20) return U[n]; const d = Math.floor(n / 10), u = n % 10;
  if (d === 7 || d === 9) return DZ[d] + (d === 7 && u === 1 ? "-et-" : "-") + U[10 + u];
  if (!u) return DZ[d] + (d === 8 ? "s" : ""); return DZ[d] + (u === 1 && d !== 8 ? "-et-" : "-") + U[u]; }
function c1000(n) { const c = Math.floor(n / 100), r = n % 100; let s = c > 1 ? U[c] + " cent" + (r ? "" : "s") : c === 1 ? "cent" : ""; if (r) s += (s ? " " : "") + c100(r); return s; }
function lettres(m) { const e = Math.floor(m), mi = Math.floor(e / 1e6), k = Math.floor((e % 1e6) / 1000), r = e % 1000, p = [];
  if (mi) p.push(c1000(mi) + " million" + (mi > 1 ? "s" : "")); if (k) p.push(k === 1 ? "mille" : c1000(k).replace(/cents$/, "cent") + " mille"); if (r) p.push(c1000(r));
  const s = p.join(" ") + (e >= 1e6 && e % 1e6 === 0 ? " de" : "") + " dirham" + (e > 1 ? "s" : ""); return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------- contenu ---------- */
const guide = C.guides[0];
const parId = Object.fromEntries(C.paras.map((p) => [p.id, p]));
const ordre = (n) => { const [a, b] = n.split("-").map(Number); return a * 10000 + b; };
const parasTries = [...C.paras].sort((a, b) => ordre(a.id) - ordre(b.id));
const gratuit = (id) => C.gratuits.includes(id);
const acces = (id) => connecte || gratuit(id);
const chapitre = (code) => C.chapitres.find((c) => c.code === code);
const partie = (n) => C.parties.find((p) => p.n === n);

function normRef(lib) {
  const s = lib.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const slug = (x) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  let m = s.match(/\b(circulaire|circ\.?|note)\b[^0-9a-z]*(?:adii\s*)?(?:n[°o]\.?\s*)?([a-z]?\d[\w/.-]*)/i);
  if (m) return (m[1].startsWith("note") ? "note" : "circ") + "-" + slug(m[2]);
  m = s.match(/\bcdii\b.*?\bart(?:icle)?s?\.?\s*(\d+(?:\s*(?:bis|ter|quater|quinquies))?)/); if (m) return "cdii-art-" + slug(m[1]);
  if (/\bcdii\b/.test(s)) return "cdii";
  m = s.match(/\b(decret|arrete|loi|dahir)\b[^0-9]*(?:n[°o]\.?\s*)?(\d[\d.-]*\d)/); if (m) return m[1] + "-" + slug(m[2]);
  return slug(lib);
}

/* ---------- filigrane invisible ---------- */
const Z0 = "​", Z1 = "‌", ZB = "⁠";
const empreinte = (code) => ZB + [...parseInt(code, 16).toString(2).padStart(32, "0")].map((b) => (b === "1" ? Z1 : Z0)).join("") + ZB;
const marquer = (t) => { if (!t || !compte) return t || ""; const i = t.search(/[.;:]\s/); const e = empreinte(compte.id); return i > 0 ? t.slice(0, i + 1) + e + t.slice(i + 1) : t + e; };
function lireEmpreintes(t) { const out = new Set(); for (const m of t.matchAll(new RegExp(`${ZB}([${Z0}${Z1}]{32})${ZB}`, "g")))
  out.add(parseInt([...m[1]].map((c) => (c === Z1 ? "1" : "0")).join(""), 2).toString(16).padStart(8, "0")); return [...out]; }

/* ---------- mise en forme d'un champ texte ---------- */
function texte(v) {
  if (!v) return "";
  const blocs = [];
  for (const l0 of v.split("\n")) { const l = l0.trim(); if (!l) continue;
    const pu = l.match(/^[-–•]\s+(.*)$/), nu = l.match(/^\d+[.)]\s+(.*)$/), t = pu ? "ul" : nu ? "ol" : "p", c = (pu || nu || [])[1] ?? l;
    const der = blocs[blocs.length - 1]; if (t !== "p" && der && der.t === t) der.l.push(c); else blocs.push({ t, l: [c] }); }
  return blocs.map((b) => b.t === "p" ? `<p>${esc(b.l[0])}</p>` : `<${b.t}>${b.l.map((x) => `<li>${esc(x)}</li>`).join("")}</${b.t}>`).join("");
}

/* Dossiers : mêmes données que content/dossiers.json (disponible = guide publié) */
const DOSSIERS = [
  { slug: "douane", court: "Douane", titre: "Le Corpus des Procédures Douanières", lien: "guide.html" },
  { slug: "fiscal", court: "Fiscalité", titre: "Le Corpus des Procédures Fiscales" },
  { slug: "changes", court: "Changes", titre: "Le Corpus des Procédures des Opérations de Changes" },
  { slug: "investissements", court: "Investissements", titre: "Le Corpus des Procédures de promotion des investissements" },
  { slug: "zones-acceleration", court: "Zones d'accélération", titre: "Le Corpus des Procédures des Zones d'accélération industrielles" },
  { slug: "financements", court: "Financements", titre: "Le Corpus des Outils de Financement des projets d'investissement" },
  { slug: "bancaire", court: "Bancaire", titre: "Le Corpus des Procédures Bancaires" },
  { slug: "societes-travail", court: "Sociétés et travail", titre: "Le Corpus des Procédures du droit des sociétés et du travail" },
  { slug: "immobilier", court: "Immobilier", titre: "Le Corpus des Procédures Immobilières" },
  { slug: "urbanisme", court: "Urbanisme", titre: "Le Corpus des Procédures Urbanistiques" },
  { slug: "tourisme", court: "Tourisme", titre: "Le Corpus des Procédures Touristiques" },
];
const couvertures = () => DOSSIERS.map((d) => {
  const contenu = `<span class="couv-img"><img src="assets/couvertures/${d.slug}.webp" width="640" height="905" alt="Couverture — ${esc(d.titre)}" loading="lazy"></span><span class="couv-nom">${esc(d.court)}<span class="etat">${d.lien ? "Disponible" : "Bientôt"}</span></span>`;
  return `<li>${d.lien ? `<a class="couv" href="${d.lien}" title="${esc(d.titre)}">${contenu}</a>` : `<div class="couv bientot" title="${esc(d.titre)} — prochainement">${contenu}</div>`}</li>`;
}).join("");

/* ---------- gabarit commun ---------- */
function entete() {
  const vues = [["visiteur", "Visiteur"], ["abonne", "Abonné"], ["admin", "Administrateur"]];
  const menu = `<div class="menu-themes"><button type="button" class="menu-themes-btn" aria-expanded="false" aria-haspopup="true">Choisir votre thème <span aria-hidden="true">▾</span></button><ul class="menu-themes-liste" hidden>${DOSSIERS.map((d) => `<li>${d.lien ? `<a href="${d.lien}" title="${esc(d.titre)}">${esc(d.court)}</a>` : `<span class="off" title="${esc(d.titre)} — prochainement">${esc(d.court)}<em>Bientôt</em></span>`}</li>`).join("")}</ul></div>`;
  const nav = menu + `<a href="tarifs.html" ${page === "tarifs" ? 'aria-current="page"' : ""}>Tarifs</a>`;
  const droite = !connecte
    ? `<a class="btn secondaire petit" href="connexion.html">Se connecter</a><a class="btn petit" href="inscription.html">Essai gratuit</a>`
    : `${admin ? '<a class="btn secondaire petit" href="admin.html">Administration</a>' : ""}<a class="btn secondaire petit" href="compte.html">${esc(compte.nom)}</a><a class="btn secondaire petit" href="#" data-mode="visiteur">Se déconnecter</a>`;
  const statut = !connecte ? `<a href="inscription.html">Essai gratuit de ${D.site.essai} jours</a>` : admin ? "Administrateur" : `Abonnement actif jusqu'au ${dfr(D.abonnement.fin)}`;
  document.body.insertAdjacentHTML("afterbegin", `
  <div class="demo-barre"><div class="conteneur">
    <span><b>Démonstration</b> — données fictives, protections simulées</span>
    <span class="vues">Voir le site en tant que : ${vues.map(([k, l]) => `<button type="button" data-mode="${k}" aria-pressed="${mode === k}">${l}</button>`).join("")}</span>
  </div></div>
  <div class="bandeau"><div class="conteneur"><span>${esc(D.site.signature)}</span><span>${statut}</span></div></div>
  <header class="entete"><div class="conteneur">
    <a class="marque" href="index.html"><span class="sceau" aria-hidden="true">GP</span><span><b>${esc(D.site.nom)}</b><small>Procédures et réglementation</small></span></a>
    <nav class="nav" aria-label="Guides">${nav}</nav>
    <div class="droite">${droite}</div>
  </div></header>`);
  document.body.insertAdjacentHTML("beforeend", `
  <footer class="pied"><div class="conteneur">
    <div><b style="color:#fff">${esc(D.site.nom)}</b><div>Édité par ${esc(D.emetteur.raison)}. Contenus protégés : reproduction et extraction interdites.</div></div>
    <nav aria-label="Informations légales"><a href="legal.html">Conditions générales</a><a href="legal.html#confidentialite">Confidentialité</a><a href="legal.html#mentions">Mentions légales</a><a href="tarifs.html">Tarifs</a></nav>
  </div></footer>`);
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]"); if (!b) return;
    e.preventDefault(); ecrire("mode", b.dataset.mode);
    if (b.dataset.mode === "visiteur" && /^(compte|abonnement|factures|facture|membres|favoris|admin)/.test(page)) location.href = "index.html"; else location.reload();
  });
}

const navGuide = (actif, q = "") => `
  <div class="carte navguide">
    <div><span class="etiquette">${esc(guide.sous)}</span><div class="titre-guide">${esc(guide.titre)}</div></div>
    <nav class="nav" aria-label="Rubriques du guide">
      <a href="guide.html" ${actif === "sommaire" ? 'aria-current="page"' : ""}>Sommaire</a>
      <a href="recherche.html" ${actif === "recherche" ? 'aria-current="page"' : ""}>Recherche</a>
      <a href="parcours.html" ${actif === "parcours" ? 'aria-current="page"' : ""}>Parcours</a>
    </nav>
    <form action="recherche.html" class="recherche-rapide" style="margin-left:auto"><input name="q" type="search" value="${esc(q)}" placeholder="Mot-clé ou n° (ex. 7-012)" aria-label="Rechercher dans le guide"></form>
  </div>`;

const refuse = (titre, txt, boutons) => `<div class="message info" style="display:grid;gap:10px;padding:18px"><b style="font-size:1.05rem">${titre}</b><span>${txt}</span><div style="display:flex;gap:8px;flex-wrap:wrap">${boutons}</div></div>`;
const refuseVisiteur = () => refuse("Contenu réservé aux abonnés", "Connectez-vous ou démarrez un essai gratuit pour consulter ce paragraphe.",
  `<a class="btn" href="connexion.html">Se connecter</a><a class="btn secondaire" href="inscription.html">Essai gratuit</a>`);

const menuLateral = (liens) => `<nav class="menu-lateral">${liens.map(([h, l]) => `<a href="${h}" ${location.pathname.endsWith(h) ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>`;
const menuCompte = () => menuLateral([["compte.html", "Tableau de bord"], ["favoris.html", "Favoris et suivis"], ["abonnement.html", "Abonnement"], ["factures.html", "Factures"], ["membres.html", "Utilisateurs"]]);
const menuAdmin = () => menuLateral([["admin.html", "Vue d'ensemble"], ["admin-paiements.html", "Paiements"], ["admin-clients.html", "Clients"], ["admin-surveillance.html", "Surveillance"], ["admin-montages.html", "Montages"], ["admin-filigrane.html", "Identifier une copie"]]);

/* ======================= PAGES ======================= */
const P = {};

P.accueil = () => `
  <section class="heros pleine"><div class="conteneur">
    <span class="etiquette">Référentiels professionnels · mise à jour continue</span>
    <h1>La réglementation marocaine, expliquée paragraphe par paragraphe</h1>
    <p>Texte applicable, position de l'administration, données clés, cas pratiques et conseils d'expert. Chaque notion a son numéro, chaque mise à jour est datée et tracée.</p>
    <form action="recherche.html"><input name="q" type="search" placeholder="Rechercher un régime, une procédure, une circulaire…" aria-label="Rechercher"><button class="btn laiton" type="submit">Rechercher</button></form>
    <h2 class="couv-titre" id="dossiers">Choisissez un domaine</h2>
    <ul class="couvertures" aria-labelledby="dossiers">${couvertures()}</ul>
  </div></section>
  <div class="titre-section"><h2>Ce que vous trouvez dans chaque paragraphe</h2></div>
  <div class="atouts" style="margin-bottom:40px">
    <div><h3>Le texte applicable</h3><p>Articles, décrets et circulaires cités avec leur référence exacte et leur date.</p></div>
    <div><h3>La position de l'administration</h3><p>Ce que disent les circulaires et notes, et comment elles s'articulent.</p></div>
    <div><h3>Les données clés</h3><p>Délais, seuils, autorités compétentes et pièces exigées, lisibles en un coup d'œil.</p></div>
    <div><h3>Le conseil de l'expert</h3><p>Cas pratique, pièges fréquents et bonnes pratiques tirés du terrain.</p></div>
  </div>
  <div class="carte" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
    <div><h2 style="font-size:1.3rem">Essayez gratuitement pendant ${D.site.essai} jours</h2><p class="muet" style="margin:4px 0 0">Sans engagement. Accès réservé aux entreprises et professionnels du secteur privé.</p></div>
    <div style="display:flex;gap:8px"><a class="btn" href="inscription.html">Créer un compte</a><a class="btn secondaire" href="tarifs.html">Voir les formules</a></div>
  </div>`;

P.tarifs = () => `
  <div class="titre-section"><div><span class="etiquette">Abonnements annuels</span><h1 style="font-size:2rem">Formules et tarifs</h1></div>
    <a class="btn secondaire" href="inscription.html">Essai gratuit de ${D.site.essai} jours</a></div>
  <p class="message info" style="margin-top:0">Prix d'exemple pour la démonstration : les tarifs réels sont à fixer dans l'administration.</p>
  <div class="grille-3">${D.plans.map((p) => `
    <div class="carte tarif${p.avant ? " mis-en-avant" : ""}">
      <span class="etiquette">${esc(p.bases)}</span><h2>${esc(p.nom)}</h2>
      <div class="prix">${mad(p.ht)} <small class="muet" style="font-size:.9rem">HT / an</small></div>
      <p class="muet" style="margin:0">${esc(p.desc)}</p>
      <ul><li>${p.sieges} utilisateur${p.sieges > 1 ? "s nommés" : " nommé"}</li><li>Durée : ${p.mois} mois</li><li>Mises à jour continues incluses</li><li>Alertes sur les paragraphes suivis</li><li>Facture conforme, paiement par virement</li></ul>
      <a class="btn" href="abonnement.html?formule=${p.code}">Choisir cette formule</a>
    </div>`).join("")}</div>
  <p class="muet" style="margin-top:20px;font-size:.88rem">Paiement par virement bancaire à réception de la facture proforma ; l'accès est activé dès réception du règlement. Les prix s'entendent hors TVA (20 %).</p>`;

P.guide = () => {
  const total = C.paras.length;
  const parties = C.parties.map((pt, i) => {
    const chs = C.chapitres.filter((c) => c.p === pt.n);
    const n = C.paras.filter((x) => x.p === pt.n).length;
    return `<details class="sommaire-partie" ${n || i === 0 ? "open" : ""}>
      <summary><span class="num">Partie ${pt.n}</span><h2>${esc(pt.t)}</h2><span class="compte">${n} paragraphe${n > 1 ? "s" : ""}</span></summary>
      ${chs.map((ch) => { const ps = parasTries.filter((x) => x.ch === ch.code);
        return `<div class="sommaire-chap"><h3><span class="num muet">${ch.code}</span> ${esc(ch.t)}</h3>${!ps.length ? '<div class="vide">En cours de rédaction</div>' : `<ul>${ps.map((x) => `<li>${acces(x.id)
          ? `<a href="lecture.html?id=${x.id}"><span class="num">${x.id}</span><span>${esc(x.t)}</span>${gratuit(x.id) && !connecte ? ' <span class="badge ok">Accès libre</span>' : ""}</a>`
          : `<span class="verrou" title="Réservé aux abonnés"><span class="num">${x.id}</span><span>${esc(x.t)}</span></span>`}</li>`).join("")}</ul>`}</div>`; }).join("")}
    </details>`; }).join("");
  return navGuide("sommaire") + `
  <div class="lecteur-guide" style="display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:22px;align-items:start">
    <div>
      <div class="titre-section"><h1 style="font-size:1.7rem">Sommaire</h1><span class="muet">${total} paragraphes rédigés · ${C.parties.length} parties · ${C.chapitres.length} chapitres</span></div>
      ${!connecte ? '<p class="message info">Les titres sont consultables librement. Les paragraphes marqués <span class="badge ok">Accès libre</span> sont lisibles sans abonnement.</p>' : ""}
      ${parties}
    </div>
    <aside class="pile">
      <div class="carte"><h2>Présentation</h2><p class="muet" style="margin:0">${esc(guide.desc)}</p></div>
      <div class="carte"><h2>Dernières mises à jour</h2><ul class="liste-maj">${parasTries.slice(0, 6).map((m) => `<li><span class="num muet">${dfr(m.maj)}</span> ${connecte ? `<a href="lecture.html?id=${m.id}">n° ${m.id} ${esc(m.t)}</a>` : `n° ${m.id} ${esc(m.t)}`}</li>`).join("")}</ul></div>
      ${!connecte ? '<div class="carte"><h2>Accéder au guide complet</h2><p class="muet" style="margin-top:0">Essai gratuit, puis abonnement annuel pour vous ou votre équipe.</p><a class="btn" href="inscription.html">Essai gratuit</a></div>' : ""}
    </aside>
  </div>`;
};

P.lecture = () => {
  const p = parId[params.get("id")] || parId["7-005"];
  document.title = `n° ${p.id} · ${D.site.nom}`;
  const ch = chapitre(p.ch), pt = partie(p.p);
  const i = parasTries.indexOf(p), prec = parasTries[i - 1], suiv = parasTries[i + 1];
  const lisible = acces(p.id);
  const abonne = compte ? `${compte.nom} · ${compte.org}` : "visiteur";
  const suivis = lire("suivis", ["7-003"]), favoris = lire("favoris", []);
  const verif = { oui: ["ok", "Sources vérifiées"], partiel: ["partiel", "Vérification partielle"], non: ["alerte", "Sources à vérifier"] }[p.verif];
  const bloc = (lib, html, cls = "") => html ? `<div class="bloc ${cls}"><span class="etiquette">${lib}</span><div class="corps">${html}</div></div>` : "";
  const toc = C.parties.filter((x) => C.paras.some((y) => y.p === x.n)).map((x) => `<details open><summary><span class="num" style="color:var(--laiton)">${x.n}</span> ${esc(x.t)}</summary>
    ${C.chapitres.filter((c) => c.p === x.n && C.paras.some((y) => y.ch === c.code)).map((c) => `<div class="chap">${c.code} ${esc(c.t)}</div>
      ${parasTries.filter((y) => y.ch === c.code).map((y) => `<a href="lecture.html?id=${y.id}" ${y.id === p.id ? 'aria-current="page"' : ""}><span class="num">${y.id}</span><span>${esc(y.t)}</span></a>`).join("")}`).join("")}</details>`).join("");
  const fil = Array.from({ length: 27 }, (_, k) => { const r = Math.floor(k / 3), c = k % 3; return `<span style="top:${r * 12 + 4}%;left:${c * 36 - 6 + (r % 2) * 14}%">${esc(abonne)} · ${dfr(0)}</span>`; }).join("");
  let corps;
  if (!lisible) {
    corps = (p.enbref ? `<div class="enbref"><span class="etiquette">En bref</span><p>${esc(p.enbref)}</p></div>` : "") + refuseVisiteur();
  } else {
    corps = `
      ${p.demo_enrichi ? '<p class="message info" style="margin-top:0">Ce paragraphe montre le gabarit complet (en bref, données clés, cas pratique, questions fréquentes), rédigé pour la démonstration à partir du texte du paragraphe.</p>' : ""}
      ${p.enbref ? `<div class="enbref"><span class="etiquette">En bref</span><p>${esc(marquer(p.enbref))}</p></div>` : ""}
      ${p.textes?.length ? `<div class="bloc textes"><span class="etiquette">Texte applicable</span><ul>${p.textes.map((t) => `<li><a href="texte.html?ref=${normRef(t)}">${esc(t)}</a></li>`).join("")}</ul></div>` : ""}
      ${bloc("Principe", texte(marquer(p.principe)))}
      ${bloc("Position de l'administration", texte(p.admin))}
      ${p.donnees?.length ? `<div class="bloc"><span class="etiquette">Données clés</span><div><table class="donnees"><tbody>${p.donnees.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table></div></div>` : ""}
      ${bloc("Cas pratique", texte(marquer(p.cas)), "cas")}
      ${bloc("Jurisprudence", texte(p.juris))}
      ${bloc("Conseil pratique", texte(marquer(p.conseil)), "conseil")}
      ${p.faq?.length ? `<div class="bloc"><span class="etiquette">Questions fréquentes</span><div class="faq">${p.faq.map(([q, r]) => `<details><summary>${esc(q)}</summary><p>${esc(r)}</p></details>`).join("")}</div></div>` : ""}
      ${p.renvois?.length ? `<div class="bloc"><span class="etiquette">Voir aussi</span><div class="puces">${p.renvois.map((r) => parId[r]
        ? `<a class="puce" href="lecture.html?id=${r}"><span class="num">n° ${r}</span> ${esc(parId[r].t)}</a>` : `<span class="puce muet"><span class="num">n° ${r}</span> en préparation</span>`).join("")}</div></div>` : ""}
      ${admin && p.balises?.length ? `<div class="balises"><b>Balises à trancher (visible des administrateurs seulement)</b><ul>${p.balises.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>` : ""}
      <p class="consulte-par">Consulté par ${esc(abonne)} le ${dlong(new Date())}. Reproduction et diffusion interdites.</p>`;
  }
  return navGuide("lecture") + `
  <div class="lecteur">
    <aside aria-label="Sommaire"><nav class="toc"><p class="etiquette" style="margin:0 0 6px">Sommaire</p>${toc}</nav></aside>
    <article class="document">
      ${lisible && connecte ? `<div class="filigrane" aria-hidden="true">${fil}</div>` : ""}
      <div class="fil"><a href="guide.html">${esc(guide.titre)}</a> › Partie ${p.p} · ${esc(pt.t)} › ${esc(ch.t)}</div>
      <div class="entete-para"><span class="num">n° ${p.id}</span><h1>${esc(p.t)}</h1></div>
      <div class="meta">${verif ? `<span class="badge ${verif[0]}">${verif[1]}</span>` : ""}${p.mod ? '<span class="badge alerte">Modifié récemment</span>' : ""}${gratuit(p.id) ? '<span class="badge ok">Accès libre</span>' : ""}<span>Mis à jour le ${dfr(p.maj)}</span></div>
      ${corps}
      <div class="navigation-para">${prec ? `<a class="btn secondaire petit" href="lecture.html?id=${prec.id}">‹ n° ${prec.id}</a>` : "<span></span>"}${suiv ? `<a class="btn secondaire petit" href="lecture.html?id=${suiv.id}">n° ${suiv.id} ›</a>` : ""}</div>
    </article>
    <aside class="droite outils" aria-label="Outils">
      ${connecte && lisible ? `<div class="carte"><h2>Mon suivi</h2><div style="display:grid;gap:8px">
        <button class="btn petit ${suivis.includes(p.id) ? "" : "secondaire"}" type="button" data-bascule="suivis" data-id="${p.id}">${suivis.includes(p.id) ? "Suivi activé : alerte en cas de modification" : "Suivre ce paragraphe"}</button>
        <button class="btn petit ${favoris.includes(p.id) ? "" : "secondaire"}" type="button" data-bascule="favoris" data-id="${p.id}">${favoris.includes(p.id) ? "Dans mes favoris" : "Ajouter aux favoris"}</button></div></div>` : ""}
      ${lisible && p.hist?.length ? `<div class="carte"><h2>Historique des versions</h2><ul>${p.hist.map((h) => `<li class="muet">${esc(h)}</li>`).join("")}</ul></div>` : ""}
      <div class="carte"><h2>Dans ce chapitre</h2><ul>${parasTries.filter((y) => y.ch === p.ch).map((y) => `<li>${y.id === p.id ? `<b><span class="num">${y.id}</span> ${esc(y.t)}</b>` : `<a href="lecture.html?id=${y.id}" style="text-decoration:none"><span class="num">${y.id}</span> ${esc(y.t)}</a>`}</li>`).join("")}</ul></div>
      ${lisible && connecte ? `<div class="carte"><h2>Protection active</h2><ul class="muet"><li>Filigrane visible à votre nom</li><li>Empreinte invisible propre à votre compte</li><li>Copie limitée à 1 500 caractères, source ajoutée</li></ul></div>` : ""}
    </aside>
  </div>`;
};

P.recherche = () => {
  const q = (params.get("q") || "").trim();
  if (connecte && /^\d+-\d{3}$/.test(q) && parId[q]) { location.replace(`lecture.html?id=${q}`); return ""; }
  let res = [];
  const mots = q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter((m) => m.length > 1);
  if (connecte && mots.length) {
    const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    res = parasTries.map((p) => { const h = norm([p.id, p.t, p.enbref, p.principe, p.admin, p.conseil, ...(p.textes || [])].join(" "));
      const score = mots.reduce((s, m) => s + (h.split(m).length - 1) + (norm(p.t).includes(m) ? 5 : 0), 0);
      return { p, score, ok: mots.every((m) => h.includes(m)) }; }).filter((x) => x.ok).sort((a, b) => b.score - a.score);
  }
  const extrait = (p) => { let t = esc((p.enbref || p.principe || "").slice(0, 220)) + "…";
    mots.forEach((m) => { if (m.length > 2) t = t.replace(new RegExp("(" + m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"), "<mark>$1</mark>"); }); return t; };
  return navGuide("recherche", q) + `
    <div class="titre-section"><h1 style="font-size:1.6rem">Recherche dans le guide</h1></div>
    <form action="recherche.html" style="display:flex;gap:8px;margin-bottom:18px"><input name="q" type="search" value="${esc(q)}" placeholder="Mot-clé, numéro de paragraphe ou référence de texte (ex. 6538/313)" aria-label="Recherche" class="grand-champ"><button class="btn" type="submit">Rechercher</button></form>
    ${!connecte ? refuseVisiteur() : !q ? '<p class="muet">Tapez un mot-clé, ou un numéro de paragraphe pour l\'ouvrir directement. Essayez : caution, apurement, 6538/313, 7-004.</p>'
      : `<p class="muet">${res.length} paragraphe${res.length > 1 ? "s" : ""} pour « ${esc(q)} »</p><div class="resultats">${res.map(({ p }) => `
        <a class="resultat" href="lecture.html?id=${p.id}"><span class="etiquette"><span class="num" style="color:var(--laiton)">n° ${p.id}</span> · chapitre ${p.ch}</span><h3>${esc(p.t)}</h3><p>${extrait(p)}</p></a>`).join("") || '<div class="carte muet">Aucun résultat. Essayez un terme plus général.</div>'}</div>`}`;
};

P.parcours = () => navGuide("parcours") + `
  <div class="titre-section"><h1 style="font-size:1.6rem">Parcours par situation</h1><span class="muet">Les paragraphes utiles, dans l'ordre de l'opération</span></div>
  <div class="grille-3">${C.parcours.map((pc) => `
    <div class="carte" style="display:grid;gap:10px;align-content:start">
      ${pc.gratuit ? '<span class="badge ok" style="justify-self:start">Accès libre</span>' : '<span class="etiquette">Abonnés</span>'}
      <h2 style="font-size:1.15rem;margin:0">${esc(pc.t)}</h2><p class="muet" style="margin:0;font-size:.9rem">${esc(pc.d)}</p>
      <ol class="etapes">${pc.etapes.map((e) => `<li>${(connecte || pc.gratuit) && parId[e] ? `<a href="lecture.html?id=${e}"><span class="num">n° ${e}</span> ${esc(parId[e].t)}</a>` : `<span class="muet"><span class="num">n° ${e}</span> ${esc(parId[e]?.t || "en préparation")}</span>`}</li>`).join("")}</ol>
    </div>`).join("")}
    <div class="carte muet" style="border-style:dashed">D'autres parcours sont publiés au fur et à mesure de la rédaction : importer une ligne de production en plusieurs envois, répondre à un procès-verbal…</div>
  </div>`;

P.texte = () => {
  const ref = params.get("ref") || "circ-6538-313";
  const cit = parasTries.filter((p) => (p.textes || []).some((t) => normRef(t) === ref));
  const lib = cit.flatMap((p) => p.textes).find((t) => normRef(t) === ref) || ref;
  if (!connecte) return navGuide("lecture") + refuseVisiteur();
  return navGuide("lecture") + `
  <div class="lecteur-guide" style="display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:22px;align-items:start">
    <article class="document"><span class="etiquette">Texte source</span><h1 style="font-size:1.6rem;margin:6px 0 10px">${esc(lib)}</h1>
      <p class="message info">Le texte intégral sera mis en ligne à partir du corpus des circulaires. Les paragraphes du guide qui le citent sont listés ci-contre.</p></article>
    <aside class="carte"><h2 style="font-size:1.05rem">Paragraphes qui citent ce texte</h2><ul class="liste-maj">${cit.map((p) => `<li><a href="lecture.html?id=${p.id}"><span class="num">n° ${p.id}</span> ${esc(p.t)}</a><div class="muet" style="font-size:.8rem">${esc(p.textes.find((t) => normRef(t) === ref))}</div></li>`).join("")}</ul></aside>
  </div>`;
};

const formAuth = (titre, intro, champs, bouton, bas) => `
  <div class="auth carte"><h1 style="font-size:1.6rem;margin-bottom:${intro ? 6 : 14}px">${titre}</h1>${intro ? `<p class="muet" style="margin-top:0">${intro}</p>` : ""}
    <form class="formulaire" id="formAuth">${champs.map(([n, l, t, aide]) => `<label class="champ" for="${n}">${l}<input id="${n}" name="${n}" type="${t || "text"}" required>${aide ? `<small>${aide}</small>` : ""}</label>`).join("")}
      <div class="message erreur" id="erreurAuth" hidden></div>
      <button class="btn" type="submit">${bouton}</button></form>${bas}</div>`;

P.connexion = () => formAuth("Se connecter", "", [["email", "Adresse e-mail", "email"], ["mdp", "Mot de passe", "password"]], "Se connecter",
  `<p style="font-size:.88rem;margin-bottom:0"><a href="#">Mot de passe oublié ?</a> · Pas encore de compte ? <a href="inscription.html">Essai gratuit</a></p>
   <p class="muet" style="font-size:.8rem">Démonstration : n'importe quelle adresse fonctionne. Une connexion sur un second appareil fermerait automatiquement la première session.</p>`);

P.inscription = () => formAuth("Créer un compte", `Essai gratuit de ${D.site.essai} jours, sans engagement. Réservé aux entreprises et professionnels du secteur privé.`,
  [["nom", "Nom et prénom"], ["email", "Adresse e-mail professionnelle", "email"], ["mdp", "Mot de passe", "password", "10 caractères au minimum."]], "Créer mon compte",
  `<p style="font-size:.82rem" class="muet">En créant un compte, vous acceptez les <a href="legal.html">conditions générales</a>, notamment l'interdiction de toute extraction des contenus. Essayez une adresse en gov.ma pour voir le refus.</p>
   <p style="font-size:.88rem;margin-bottom:0">Déjà inscrit ? <a href="connexion.html">Se connecter</a></p>`);

const exigerCompte = () => !connecte ? `<div class="auth carte"><h1 style="font-size:1.4rem">Espace réservé</h1><p class="muet">Connectez-vous pour accéder à votre compte.</p><button class="btn" data-mode="abonne">Se connecter (démonstration)</button></div>` : null;
const exigerAdmin = () => !admin ? `<div class="auth carte"><h1 style="font-size:1.4rem">Administration</h1><p class="muet">Cette partie est réservée aux administrateurs de la plateforme.</p><button class="btn" data-mode="admin">Voir en tant qu'administrateur</button></div>` : null;
const enCompte = (html) => exigerCompte() || `<div class="compte">${menuCompte()}<div style="min-width:0" class="pile">${html}</div></div>`;
const enAdmin = (html) => exigerAdmin() || `<div class="compte">${menuAdmin()}<div style="min-width:0" class="pile">${html}</div></div>`;
const STAT = { essai: ["info", "Essai"], actif: ["ok", "Actif"], en_attente: ["partiel", "En attente de paiement"], suspendu: ["alerte", "Suspendu"], expire: ["neutre", "Expiré"] };
const planDe = (c) => D.plans.find((p) => p.code === c);

P.compte = () => {
  const suivis = lire("suivis", ["7-003"]);
  const ab = planDe(D.abonnement.plan);
  return enCompte(`
    <h1 style="font-size:1.7rem">Tableau de bord</h1>
    <div class="chiffres">
      <div><span>Abonnement</span><b style="font-size:1.05rem;margin-top:6px">${esc(ab.nom)}</b></div>
      <div><span>Échéance</span><b>${dfr(D.abonnement.fin)}</b></div>
      <div><span>Paragraphes suivis</span><b>${suivis.length}</b></div>
      <div><span>Lectures (30 jours)</span><b>142</b></div>
    </div>
    <div class="carte"><h2>Alertes de mise à jour</h2>${suivis.length ? `<ul style="margin:0;padding-left:18px">${suivis.filter((s) => parId[s]).map((s) => `<li><a href="lecture.html?id=${s}">n° ${s} ${esc(parId[s].t)}</a> <span class="muet">— modifié le ${dfr(parId[s].maj)}</span></li>`).join("")}</ul>` : '<p class="muet" style="margin:0">Aucune modification sur vos paragraphes suivis.</p>'}</div>
    <div class="carte"><h2>Historique des abonnements</h2><div class="defile"><table class="tableau"><thead><tr><th>Formule</th><th>Statut</th><th>Début</th><th>Fin</th></tr></thead><tbody>
      ${[...D.historique].reverse().map((h) => `<tr><td>${esc(h.plan)}</td><td><span class="badge ${STAT[h.statut][0]}">${STAT[h.statut][1]}</span></td><td>${dfr(h.debut)}</td><td>${dfr(h.fin)}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="carte"><h2>Entreprise</h2>${champsOrg(D.organisation)}</div>`);
};

const champsOrg = (o) => `<form class="formulaire" data-simule="Informations enregistrées.">
  <label class="champ" for="rs">Raison sociale<input id="rs" value="${esc(o.raison)}" required></label>
  <div class="deux-col"><label class="champ" for="ice">ICE<input id="ice" value="${esc(o.ice)}" pattern="\\d{15}"><small>15 chiffres — figure sur vos factures</small></label><label class="champ" for="rc">Registre de commerce<input id="rc" value="${esc(o.rc)}"></label></div>
  <label class="champ" for="adr">Adresse<input id="adr" value="${esc(o.adresse)}"></label>
  <div class="deux-col"><label class="champ" for="ville">Ville<input id="ville" value="${esc(o.ville)}"></label><label class="champ" for="tel">Téléphone<input id="tel" value="${esc(o.tel)}"></label></div>
  <label class="champ" for="mailf">E-mail de facturation<input id="mailf" type="email" value="${esc(o.email)}"></label>
  <div><button class="btn secondaire" type="submit">Enregistrer les modifications</button></div></form>`;

P.abonnement = () => enCompte(`
  <h1 style="font-size:1.7rem">Renouveler ou changer de formule</h1>
  <p class="message info">Formule en cours : <b>${esc(planDe(D.abonnement.plan).nom)}</b>, jusqu'au ${dfr(D.abonnement.fin)}. Un renouvellement prend effet à la fin de la période en cours.</p>
  <div class="carte"><form class="formulaire" action="facture.html">
    <div class="defile"><table class="tableau"><thead><tr><th></th><th>Formule</th><th>Utilisateurs</th><th>Durée</th><th class="chiffre">HT</th><th class="chiffre">TTC</th></tr></thead><tbody>
      ${D.plans.map((p) => `<tr><td><input type="radio" name="formule" value="${p.code}" id="pl-${p.code}" ${p.code === (params.get("formule") || D.abonnement.plan) ? "checked" : ""} required></td>
        <td><label for="pl-${p.code}"><b>${esc(p.nom)}</b><br><span class="muet" style="font-size:.85rem">${esc(p.desc)}</span></label></td><td>${p.sieges}</td><td>${p.mois} mois</td><td class="chiffre">${mad(p.ht)}</td><td class="chiffre">${mad(ttc(p.ht))}</td></tr>`).join("")}
    </tbody></table></div>
    <p class="muet" style="margin:0;font-size:.88rem">Une facture proforma est émise au nom de ${esc(D.organisation.raison)}. Réglez-la par virement en indiquant son numéro : l'accès est activé dès réception du paiement, et la facture définitive est alors disponible dans votre espace.</p>
    <div><button class="btn" type="submit">Recevoir la facture proforma</button></div>
  </form></div>`);

const lignesFactures = () => {
  const nouvelles = lire("proformas", []);
  return [...nouvelles.map((n) => ({ id: n.id, date: 0, statut: "proforma", plan: n.plan })), ...D.factures];
};
P.factures = () => enCompte(`
  <h1 style="font-size:1.7rem">Factures</h1>
  <div class="defile"><table class="tableau"><thead><tr><th>Numéro</th><th>Date</th><th>Objet</th><th class="chiffre">TTC</th><th>Statut</th><th></th></tr></thead><tbody>
    ${lignesFactures().map((f) => { const pl = planDe(f.plan); return `<tr><td class="num">${f.id}</td><td>${dfr(f.date)}</td><td>Abonnement « ${esc(pl.nom)} » — ${pl.mois} mois</td><td class="chiffre">${mad(ttc(pl.ht))}</td>
      <td>${f.statut === "payee" ? '<span class="badge ok">Payée</span>' : '<span class="badge partiel">Proforma — en attente</span>'}</td><td><a class="btn secondaire petit" href="facture.html?id=${f.id}">Afficher</a></td></tr>`; }).join("")}
  </tbody></table></div>`);

P.facture = () => {
  if (!connecte) return exigerCompte();
  let f;
  if (params.get("formule")) {
    const liste = lire("proformas", []);
    const id = `PF-2026-${String(16 + liste.length).padStart(4, "0")}`;
    liste.unshift({ id, plan: params.get("formule") }); ecrire("proformas", liste);
    history.replaceState(null, "", `facture.html?id=${id}`);
    f = { id, statut: "proforma", date: 0, plan: params.get("formule"), client: { raison: D.organisation.raison, ice: D.organisation.ice, adresse: D.organisation.adresse, ville: D.organisation.ville } };
  } else {
    const id = params.get("id");
    f = D.factures.find((x) => x.id === id) || D.enAttente.find((x) => x.id === id);
    if (f && !f.statut) f = { ...f, statut: "proforma" };
    if (!f) { const n = lire("proformas", []).find((x) => x.id === id) || { id: "PF-2026-0016", plan: "douane-solo" };
      f = { id: n.id, statut: "proforma", date: 0, plan: n.plan, client: { raison: D.organisation.raison, ice: D.organisation.ice, adresse: D.organisation.adresse, ville: D.organisation.ville } }; }
  }
  const pl = planDe(f.plan), E = D.emetteur, def = f.statut === "payee";
  const ht = pl.ht, tva = Math.round(ht * 0.2 * 100) / 100, t = ttc(ht);
  return `
  <div class="no-print" style="display:flex;justify-content:space-between;gap:10px;margin:0 auto 14px;max-width:820px;flex-wrap:wrap">
    <a href="factures.html">‹ Retour aux factures</a><span class="muet">« Imprimer » puis « Enregistrer au format PDF » pour obtenir le fichier.</span><button class="btn" type="button" onclick="window.print()">Imprimer / PDF</button></div>
  ${!def ? '<p class="message ok no-print" style="max-width:820px;margin:0 auto 14px">Votre facture proforma est prête. Réglez-la par virement en indiquant son numéro : l\'accès est activé dès réception.</p>' : ""}
  <div class="facture">
    <header><div><h1>${def ? "FACTURE" : "FACTURE PROFORMA"}</h1><div class="num" style="font-size:1rem">N° ${f.id}</div><div class="muet">Date : ${dfr(f.date)}</div>${def ? `<div class="muet">Réf. proforma : ${f.proforma}</div>` : ""}</div>
      <div style="text-align:right"><b style="font-size:1.05rem">${esc(E.raison)} ${esc(E.forme)}</b><div>${esc(E.adresse)}</div><div>${esc(E.ville)}</div><div>ICE : ${E.ice}</div><div>RC : ${esc(E.rc)}</div><div>IF : ${esc(E.if)}</div></div></header>
    <div class="parties">
      <div><span class="etiquette">Client</span><div><b>${esc(f.client.raison)}</b></div><div>${esc(f.client.adresse)}</div><div>${esc(f.client.ville)}</div><div>ICE : ${f.client.ice}</div></div>
      <div><span class="etiquette">${def ? "Règlement" : "Modalités de paiement"}</span>${def ? `<div>Payée le ${dfr(f.payee)}</div><div>Référence du virement : ${esc(f.virement)}</div>`
        : `<div>Virement bancaire à réception</div><div>Banque : ${esc(E.banque)}</div><div>RIB : <span class="num">${E.rib}</span></div><div>Libellé du virement : <b>${f.id}</b></div>`}</div>
    </div>
    <table class="tableau"><thead><tr><th>Désignation</th><th class="chiffre">Qté</th><th class="chiffre">Prix unitaire HT</th><th class="chiffre">Total HT</th></tr></thead>
      <tbody><tr><td>Abonnement « ${esc(pl.nom)} » — ${pl.mois} mois — ${pl.sieges} utilisateur${pl.sieges > 1 ? "s" : ""}</td><td class="chiffre">1</td><td class="chiffre">${mad(ht)}</td><td class="chiffre">${mad(ht)}</td></tr></tbody></table>
    <table class="totaux"><tbody><tr><td>Total HT</td><td class="chiffre">${mad(ht)}</td></tr><tr><td>TVA 20 %</td><td class="chiffre">${mad(tva)}</td></tr><tr><td>Total TTC</td><td class="chiffre">${mad(t)}</td></tr></tbody></table>
    <p class="lettres">Arrêtée la présente ${def ? "facture" : "facture proforma"} à la somme de : ${lettres(t)} TTC.</p>
    ${!def ? '<p class="muet">L\'accès au service est activé à réception du règlement. Cette proforma ne vaut pas facture.</p>' : ""}
    <footer>${esc(E.raison)} ${esc(E.forme)} — ${esc(E.adresse)} ${esc(E.ville)} — ICE ${E.ice} — ${esc(E.email)}</footer>
  </div>`;
};

P.membres = () => {
  const ajoutes = lire("membres", []);
  const tous = [...D.membres, ...ajoutes], sieges = planDe(D.abonnement.plan).sieges;
  return enCompte(`
    <div class="titre-section"><h1 style="font-size:1.7rem">Utilisateurs</h1><span class="muet">${tous.length} / ${sieges} accès utilisés</span></div>
    <div class="defile"><table class="tableau"><thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Depuis</th><th></th></tr></thead><tbody>
      ${tous.map((m, i) => `<tr><td>${esc(m.nom)}</td><td>${esc(m.email)}</td><td>${m.role === "gestionnaire" ? '<span class="badge info">Gestionnaire</span>' : "Utilisateur"}</td><td>${dfr(m.depuis)}</td>
        <td>${m.role !== "gestionnaire" ? `<button class="btn secondaire petit" type="button" data-retirer="${i}">Retirer l'accès</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="carte"><h2>Ajouter un utilisateur</h2><p class="muet" style="margin-top:0">Chaque accès est nominatif et ne peut être ouvert que sur un poste à la fois. La personne reçoit un e-mail pour choisir son mot de passe.</p>
      <form class="formulaire" id="formMembre"><div class="message" id="msgMembre" hidden></div>
        <div class="deux-col"><label class="champ" for="mnom">Nom et prénom<input id="mnom" name="nom"></label><label class="champ" for="memail">Adresse e-mail<input id="memail" name="email" type="email" required></label></div>
        <div><button class="btn" type="submit">Envoyer l'invitation</button></div></form></div>`);
};

P.favoris = () => {
  const suivis = lire("suivis", ["7-003"]), favoris = lire("favoris", []);
  const bloc = (t, vide, l) => `<div class="carte"><h2>${t}</h2>${l.length ? `<ul class="liste-maj">${l.filter((x) => parId[x]).map((x) => `<li><a href="lecture.html?id=${x}"><span class="num">n° ${x}</span> ${esc(parId[x].t)}</a> <span class="muet" style="font-size:.82rem">— mis à jour le ${dfr(parId[x].maj)}</span></li>`).join("")}</ul>` : `<p class="muet" style="margin:0">${vide}</p>`}</div>`;
  return enCompte(`<h1 style="font-size:1.7rem">Favoris et suivis</h1>
    ${bloc("Paragraphes suivis", "Aucun paragraphe suivi. Vous serez alerté dès qu'un paragraphe suivi est modifié.", suivis)}
    ${bloc("Favoris", "Aucun favori pour l'instant. Utilisez « Ajouter aux favoris » depuis la page de lecture.", favoris)}`);
};

/* ----- administration ----- */
const payees = () => lire("payees", []);
P.admin = () => {
  const attente = D.enAttente.filter((f) => !payees().includes(f.id));
  const actifs = D.clients.filter((c) => c.statut === "actif").length, essais = D.clients.filter((c) => c.statut === "essai").length;
  return enAdmin(`<h1 style="font-size:1.7rem">Vue d'ensemble</h1>
    <div class="chiffres"><div><span>Abonnements actifs</span><b>${actifs}</b></div><div><span>Essais en cours</span><b>${essais}</b></div>
      <div><span>Encaissé ${new Date().getFullYear()} (HT)</span><b style="font-size:1.2rem">${mad(14400 * 2 + 4800 + payees().length * 4800)}</b></div><div><span>Lectures sur 24 h</span><b>481</b></div></div>
    <div class="message erreur">1 compte présente une lecture séquentielle intensive sur 24 h. <a href="admin-surveillance.html">Examiner</a></div>
    <div class="carte"><div class="titre-section" style="margin-bottom:8px"><h2 style="margin:0">Proformas en attente de paiement</h2><a href="admin-paiements.html">Tout voir</a></div>
      <div class="defile"><table class="tableau"><thead><tr><th>N°</th><th>Date</th><th>Client</th><th class="chiffre">TTC</th></tr></thead><tbody>
      ${attente.map((f) => `<tr><td class="num">${f.id}</td><td>${dfr(f.date)}</td><td>${esc(f.client.raison)}</td><td class="chiffre">${mad(ttc(planDe(f.plan).ht))}</td></tr>`).join("") || '<tr><td colspan="4" class="muet">Aucune proforma en attente.</td></tr>'}
      </tbody></table></div></div>`);
};

P["admin-paiements"] = () => {
  const ok = params.get("valide");
  const attente = D.enAttente.filter((f) => !payees().includes(f.id));
  return enAdmin(`<h1 style="font-size:1.7rem">Paiements</h1>
    ${ok ? `<div class="message ok">Paiement enregistré : facture FA-2026-${String(7 + payees().length).padStart(4, "0")} émise pour la proforma ${esc(ok)}, abonnement activé.</div>` : ""}
    <p class="muet" style="margin:0">À réception d'un virement, saisissez sa référence : la facture définitive est numérotée et l'abonnement activé immédiatement.</p>
    ${attente.map((f) => { const pl = planDe(f.plan); return `<div class="carte paiement">
      <div><span class="etiquette">Proforma ${f.id} · ${dfr(f.date)}</span><h2 style="margin:4px 0">${esc(f.client.raison)}</h2><div class="muet">Abonnement « ${esc(pl.nom)} » — ${pl.mois} mois</div>
        <div style="margin-top:6px"><b>${mad(ttc(pl.ht))}</b> TTC · <a href="facture.html?id=${f.id}">Afficher</a></div></div>
      <form class="formulaire" data-payer="${f.id}"><label class="champ" for="ref-${f.id}">Référence du virement<input id="ref-${f.id}" required></label>
        <div style="display:flex;gap:8px"><button class="btn" type="submit">Valider le paiement</button><button class="btn secondaire" type="button">Annuler</button></div></form></div>`; }).join("") || '<div class="carte muet">Aucune proforma en attente.</div>'}
    <h2 style="font-size:1.2rem;margin-top:10px">Dernières factures payées</h2>
    <div class="defile"><table class="tableau"><thead><tr><th>Facture</th><th>Payée le</th><th>Client</th><th>Virement</th><th class="chiffre">TTC</th></tr></thead><tbody>
      ${D.factures.map((f) => `<tr><td class="num"><a href="facture.html?id=${f.id}">${f.id}</a></td><td>${dfr(f.payee)}</td><td>${esc(f.client.raison)}</td><td>${f.virement}</td><td class="chiffre">${mad(ttc(planDe(f.plan).ht))}</td></tr>`).join("")}
    </tbody></table></div>`);
};

P["admin-clients"] = () => enAdmin(`<h1 style="font-size:1.7rem">Clients</h1>
  <div class="defile"><table class="tableau"><thead><tr><th>Entreprise</th><th>ICE</th><th>Utilisateurs</th><th>Formule</th><th>Statut</th><th>Fin</th><th></th></tr></thead><tbody>
  ${D.clients.map((c) => `<tr><td><b>${esc(c.raison)}</b><br><span class="muet" style="font-size:.8rem">${esc(c.ville)} · client depuis le ${dfr(c.depuis)}</span></td><td class="num">${c.ice}</td><td>${c.users}</td><td>${c.plan}</td>
    <td><span class="badge ${STAT[c.statut][0]}">${STAT[c.statut][1]}</span></td><td>${dfr(c.fin)}</td>
    <td>${c.statut === "actif" ? '<button class="btn secondaire petit" type="button">Suspendre</button>' : c.statut === "suspendu" ? '<button class="btn secondaire petit" type="button">Réactiver</button>' : ""}</td></tr>`).join("")}
  </tbody></table></div>`);

P["admin-surveillance"] = () => {
  const bloques = lire("bloques", []);
  return enAdmin(`<h1 style="font-size:1.7rem">Surveillance des consultations (24 h)</h1>
    <p class="muet" style="margin:0">Une lecture majoritairement séquentielle (7-001, 7-002, 7-003…) sur un grand volume est la signature d'une aspiration automatique. Le blocage ferme aussi la session en cours.</p>
    <div class="defile"><table class="tableau"><thead><tr><th>Compte</th><th class="chiffre">Lectures</th><th class="chiffre">Paragraphes distincts</th><th class="chiffre">Séquentiel</th><th>Période</th><th></th></tr></thead><tbody>
    ${D.surveillance.map((l) => { const suspect = l.seq >= 60 && l.lectures >= 40, b = bloques.includes(l.email); return `<tr${suspect ? ' class="ligne-suspecte"' : ""}>
      <td><b>${esc(l.nom)}</b><br><span class="muet" style="font-size:.8rem">${esc(l.email)} · ${esc(l.org)}</span></td><td class="chiffre">${l.lectures}</td><td class="chiffre">${l.distincts}</td>
      <td class="chiffre">${suspect ? `<span class="badge alerte">${l.seq} %</span>` : l.seq + " %"}</td><td>${l.de} – ${l.a}</td>
      <td><div style="display:flex;gap:6px">${b ? '<span class="badge alerte">Bloqué</span>' : `<button class="btn secondaire petit" type="button" data-bloquer="${esc(l.email)}">Bloquer 24 h</button><button class="btn secondaire petit" type="button" data-bloquer="${esc(l.email)}">30 jours</button>`}</div></td></tr>`; }).join("")}
    </tbody></table></div>
    <div class="carte"><h2>Comptes bloqués</h2>${bloques.length ? `<ul style="margin:0;padding-left:18px">${bloques.map((e) => `<li style="margin-bottom:6px">${esc(e)} <button class="btn secondaire petit" type="button" data-debloquer="${esc(e)}">Débloquer</button></li>`).join("")}</ul>` : '<p class="muet" style="margin:0">Aucun compte bloqué.</p>'}</div>`);
};

P["admin-montages"] = () => enAdmin(`<h1 style="font-size:1.7rem">Montages du contenu</h1>
  <p class="muet" style="margin:0">Chaque chargement depuis le dépôt (<span class="num">npm run montage</span> ou action GitHub) est enregistré ici avec son rapport de contrôle.</p>
  ${D.montages.map((m) => `<details class="carte" open><summary style="cursor:pointer;display:flex;gap:12px;flex-wrap:wrap;align-items:baseline">
    <b>${m.base}</b><span class="muet">${dlong(new Date())}</span><span>${m.paras} / ${m.prevus} paragraphes</span>
    <span class="badge ${m.erreurs ? "alerte" : "ok"}">${m.erreurs} erreur</span><span class="badge partiel">${m.balises} balises</span><span class="badge neutre">${m.enrichir} à enrichir</span></summary>
    <ul style="font-size:.86rem;margin-bottom:0">${m.avert.map((a) => `<li>${esc(a)}</li>`).join("")}<li>Sections du plan non rédigées : ${142 - 4} (parties 1 à 9, hors chapitre 7.1)</li></ul></details>`).join("")}`);

P["admin-filigrane"] = () => enAdmin(`<h1 style="font-size:1.7rem">Identifier l'origine d'une copie</h1>
  <p class="muet" style="margin:0">Chaque paragraphe affiché contient une empreinte invisible propre au compte qui le consulte. Collez ci-dessous un texte retrouvé à l'extérieur : le compte d'origine s'affiche si l'empreinte a été conservée.</p>
  <div class="carte"><form class="formulaire" id="formFiligrane"><label class="champ" for="texteCopie">Texte copié<textarea id="texteCopie" rows="8" required></textarea></label>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="submit">Analyser</button><button class="btn secondaire" type="button" id="exempleCopie">Coller un exemple copié par Karim Alami</button></div></form>
    <div id="resFiligrane"></div></div>`);

P.legal = () => `<article class="carte" style="max-width:820px;margin:0 auto;padding:30px 36px">
  <h1 style="font-size:1.8rem;margin-bottom:18px">Conditions générales d'utilisation et d'abonnement</h1>
  ${[["Accès réservé", "Le service est réservé aux entreprises et professionnels du secteur privé. Chaque accès est nominatif ; les identifiants ne peuvent être ni partagés ni cédés. Une seule session peut être ouverte à la fois par compte."],
     ["Propriété intellectuelle", "Les guides, leur structure, leur numérotation et leurs contenus sont des œuvres protégées. Sont interdits : l'extraction ou la réutilisation de tout ou partie substantielle des contenus, leur reproduction en dehors d'un usage interne, leur revente, ainsi que toute collecte automatisée ou utilisation pour entraîner un système d'intelligence artificielle."],
     ["Mesures de protection", "Les consultations sont journalisées. Des limites de consultation par heure et par jour s'appliquent. Les contenus affichés comportent un marquage permettant d'identifier le compte d'origine."],
     ["Abonnement et paiement", "Une facture proforma est émise à la souscription ; l'accès est activé à réception du virement. La facture définitive est disponible dans l'espace client."],
     ["Responsabilité", "Les guides constituent une aide à la compréhension de la réglementation. Ils ne remplacent ni les textes officiels ni un conseil adapté à une situation particulière."]]
    .map(([t, c]) => `<section style="margin-bottom:16px"><h2 style="font-size:1.1rem;margin-bottom:4px">${t}</h2><p style="margin:0">${c}</p></section>`).join("")}
  <p class="muet" id="confidentialite">Politique de confidentialité et mentions légales : voir le site réel (textes à faire relire par un juriste).</p></article>`;

/* ======================= RENDU ======================= */
entete();
// Liste déroulante « Choisir votre thème »
{ const btn = document.querySelector(".menu-themes-btn"), liste = document.querySelector(".menu-themes-liste");
  const fermer = () => { liste.hidden = true; btn.setAttribute("aria-expanded", "false"); };
  btn.addEventListener("click", () => { const o = liste.hidden; liste.hidden = !o; btn.setAttribute("aria-expanded", String(o)); });
  document.addEventListener("mousedown", (e) => { if (!e.target.closest(".menu-themes")) fermer(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fermer(); }); }
$("#app").innerHTML = (P[page] || P.accueil)() || "";
if (page === "accueil") document.body.classList.add("page-accueil");

/* ---------- comportements ---------- */
// Copie encadrée sur la page de lecture
if (page === "lecture" && connecte) {
  const p = parId[params.get("id")] || parId["7-005"];
  document.addEventListener("copy", (e) => {
    const s = getSelection(); if (!s || s.isCollapsed || !e.clipboardData) return;
    let t = s.toString(), note = "";
    if (t.length > 1500) { t = t.slice(0, 1500) + " […]"; note = " Extrait limité : la reproduction intégrale est réservée à la consultation en ligne."; }
    e.clipboardData.setData("text/plain", `${t}\n\n— ${guide.titre}, n° ${p.id}. Copie à usage interne de ${compte.nom} · ${compte.org}.${note}`);
    e.preventDefault();
  });
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-bascule]");
  if (b) { const k = b.dataset.bascule, l = lire(k, k === "suivis" ? ["7-003"] : []), id = b.dataset.id;
    ecrire(k, l.includes(id) ? l.filter((x) => x !== id) : [...l, id]); location.reload(); }
  const r = e.target.closest("[data-retirer]");
  if (r) { const i = Number(r.dataset.retirer) - D.membres.length; const l = lire("membres", []); if (i >= 0) { l.splice(i, 1); ecrire("membres", l); } location.reload(); }
  const bl = e.target.closest("[data-bloquer]"); if (bl) { ecrire("bloques", [...new Set([...lire("bloques", []), bl.dataset.bloquer])]); location.reload(); }
  const db = e.target.closest("[data-debloquer]"); if (db) { ecrire("bloques", lire("bloques", []).filter((x) => x !== db.dataset.debloquer)); location.reload(); }
});
document.addEventListener("submit", (e) => {
  const f = e.target;
  if (f.id === "formAuth") {
    e.preventDefault();
    const email = f.email.value.toLowerCase(), err = $("#erreurAuth");
    if (page === "inscription") {
      if (/@(.+\.)?gov\.ma$/.test(email)) { err.hidden = false; err.textContent = "Ce service est réservé aux entreprises et professionnels du secteur privé. Utilisez votre adresse professionnelle d'entreprise."; return; }
      if (f.mdp.value.length < 10) { err.hidden = false; err.textContent = "Le mot de passe doit contenir au moins 10 caractères."; return; }
      f.outerHTML = `<div class="message ok">Un e-mail de confirmation a été envoyé à ${esc(email)}. Cliquez sur le lien qu'il contient pour activer votre compte et démarrer l'essai de ${D.site.essai} jours.</div>
        <p><button class="btn secondaire" data-mode="abonne">Simuler la confirmation et ouvrir mon compte</button></p>`;
      return;
    }
    ecrire("mode", "abonne"); location.href = "compte.html"; return;
  }
  if (f.dataset.simule) { e.preventDefault(); const m = document.createElement("div"); m.className = "message ok"; m.textContent = f.dataset.simule; f.prepend(m); return; }
  if (f.id === "formMembre") {
    e.preventDefault();
    const l = lire("membres", []), total = D.membres.length + l.length, msg = $("#msgMembre");
    msg.hidden = false;
    if (total >= planDe(D.abonnement.plan).sieges) { msg.className = "message erreur"; msg.textContent = `Votre formule comprend ${planDe(D.abonnement.plan).sieges} utilisateurs : tous les accès sont attribués.`; return; }
    l.push({ nom: f.nom.value || "—", email: f.email.value, role: "membre", depuis: 0 }); ecrire("membres", l); location.reload(); return;
  }
  if (f.dataset.payer) { e.preventDefault(); ecrire("payees", [...lire("payees", []), f.dataset.payer]); location.href = `admin-paiements.html?valide=${f.dataset.payer}`; return; }
  if (f.id === "formFiligrane") {
    e.preventDefault();
    const codes = lireEmpreintes($("#texteCopie").value), res = $("#resFiligrane");
    const connus = { "9f3a01bc": "Karim Alami (k.alami@transit-atlas.ma) — Transit Atlas SARL", "11111111": "Administrateur (admin@exemple.ma)" };
    res.innerHTML = codes.length ? codes.map((c) => `<div class="message info" style="margin-top:12px">Empreinte <span class="num">${c}</span> : ${esc(connus[c] || "aucun compte correspondant")}</div>`).join("")
      : '<p class="message erreur" style="margin-bottom:0">Aucune empreinte trouvée. Collez le texte tel qu\'il a été copié (le marquage disparaît si le texte a été ressaisi).</p>';
  }
});
const ex = $("#exempleCopie");
if (ex) ex.addEventListener("click", () => {
  const p = parId["7-002"], code = "9f3a01bc", e2 = ZB + [...parseInt(code, 16).toString(2).padStart(32, "0")].map((b) => (b === "1" ? Z1 : Z0)).join("") + ZB;
  const i = p.principe.search(/[.;:]\s/);
  $("#texteCopie").value = p.principe.slice(0, i + 1) + e2 + p.principe.slice(i + 1, 600) + "…\n\n— " + guide.titre + ", n° 7-002. Copie à usage interne de Karim Alami · Transit Atlas SARL.";
});
})();
