/* =====================================================================
   Gabarit commun (en-tête, menu « Choisir votre thème », pied de page).
   Utilisé par les pages de la maquette (app.js) ET par les pages de
   contenu générées dans guides/<thème>/ (attribut data-root = chemin
   relatif vers la racine de la maquette).
   ===================================================================== */
(function () {
const D = window.DEMO, CV = window.COUVERTURES || [];
const body = document.body;
const root = body.dataset.root || "";
const page = body.dataset.page || "";
const guideActif = body.dataset.guide || "";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const lire = (k, d) => { try { const v = localStorage.getItem("demo-" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const ecrire = (k, v) => { try { localStorage.setItem("demo-" + k, JSON.stringify(v)); } catch (e) {} };
const jour = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const dfr = (d) => (typeof d === "number" ? jour(d) : typeof d === "string" ? new Date(d + "T12:00:00") : d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

const mode = lire("mode", "visiteur");
const connecte = mode !== "visiteur", admin = mode === "admin";
const compte = connecte ? D.comptes[admin ? "admin" : "abonne"] : null;

function init() {
  const vues = [["visiteur", "Visiteur"], ["abonne", "Abonné"], ["admin", "Administrateur"]];
  const items = CV.map((d) => `<li><a href="${root}${d.lien}" title="${esc(d.titre)}" ${d.slug === guideActif ? 'aria-current="page"' : ""}>${esc(d.court)}</a></li>`).join("");
  const menu = `<div class="menu-themes"><button type="button" class="menu-themes-btn" aria-expanded="false" aria-haspopup="true">Choisir votre thème <span aria-hidden="true">▾</span></button><ul class="menu-themes-liste" hidden>${items}</ul></div>`;
  const nav = menu
    + `<a href="${root}assistant.html" ${page === "assistant" ? 'aria-current="page"' : ""}>Assistant IA</a>`
    + `<a href="${root}tarifs.html" ${page === "tarifs" ? 'aria-current="page"' : ""}>Tarifs</a>`;
  const droite = !connecte
    ? `<a class="btn secondaire petit" href="${root}connexion.html">Se connecter</a><a class="btn petit" href="${root}inscription.html">Essai gratuit</a>`
    : `${admin ? `<a class="btn secondaire petit" href="${root}admin.html">Administration</a>` : ""}<a class="btn secondaire petit" href="${root}compte.html">${esc(compte.nom)}</a><a class="btn secondaire petit" href="#" data-mode="visiteur">Se déconnecter</a>`;
  const statut = !connecte ? `<a href="${root}inscription.html">Essai gratuit de ${D.site.essai} jours</a>` : admin ? "Administrateur" : `Abonnement actif jusqu'au ${dfr(D.abonnement.fin)}`;
  body.insertAdjacentHTML("afterbegin", `
  <div class="demo-barre"><div class="conteneur">
    <span><b>Démonstration</b> — données fictives, protections simulées</span>
    <span class="vues">Voir le site en tant que : ${vues.map(([k, l]) => `<button type="button" data-mode="${k}" aria-pressed="${mode === k}">${l}</button>`).join("")}</span>
  </div></div>
  <div class="bandeau"><div class="conteneur"><span>${esc(D.site.signature)}</span><span>${statut}</span></div></div>
  <header class="entete"><div class="conteneur">
    <a class="marque" href="${root}index.html"><span class="sceau" aria-hidden="true">GP</span><span><b>${esc(D.site.nom)}</b><small>Procédures et réglementation</small></span></a>
    <nav class="nav" aria-label="Guides">${nav}</nav>
    <div class="droite">${droite}</div>
  </div></header>`);
  body.insertAdjacentHTML("beforeend", `
  <footer class="pied"><div class="conteneur">
    <div><b style="color:#fff">${esc(D.site.nom)}</b><div>Édité par ${esc(D.emetteur.raison)}. Contenus protégés : reproduction et extraction interdites.</div></div>
    <nav aria-label="Informations légales"><a href="${root}legal.html">Conditions générales</a><a href="${root}legal.html#confidentialite">Confidentialité</a><a href="${root}legal.html#mentions">Mentions légales</a><a href="${root}tarifs.html">Tarifs</a></nav>
  </div></footer>`);

  // Liste déroulante « Choisir votre thème »
  const btn = document.querySelector(".menu-themes-btn"), liste = document.querySelector(".menu-themes-liste");
  const fermer = () => { liste.hidden = true; btn.setAttribute("aria-expanded", "false"); };
  btn.addEventListener("click", () => { const o = liste.hidden; liste.hidden = !o; btn.setAttribute("aria-expanded", String(o)); });
  document.addEventListener("mousedown", (e) => { if (!e.target.closest(".menu-themes")) fermer(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fermer(); });

  // Changement de point de vue (visiteur / abonné / administrateur)
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]"); if (!b) return;
    e.preventDefault(); ecrire("mode", b.dataset.mode);
    if (b.dataset.mode === "visiteur" && /^(compte|abonnement|factures|facture|membres|favoris|admin)/.test(page)) location.href = root + "index.html"; else location.reload();
  });
}

window.Shell = { init };
if (body.dataset.shell === "auto") init();   // pages de contenu générées
})();
