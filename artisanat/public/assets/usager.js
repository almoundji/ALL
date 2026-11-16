// Portail usagers : actualités, recensement en ligne, suivi de dossier, espace artisan, marchés, Fonds spécial, infrastructures, annuaire.
import { $, $$, api, date, esc, fcfa, fmt, formData, illustration, mfcfa, options, pct, tag, toast, foncierClass } from "./common.js";

const app = $("#app");
let REF = null;
const ref = async () => (REF ||= await api("/public/referentiels"));
const store = { get: () => { try { return sessionStorage.getItem("art_token"); } catch { return null; } }, set: (t) => { try { t ? sessionStorage.setItem("art_token", t) : sessionStorage.removeItem("art_token"); } catch { /* stockage indisponible */ } } };
let memToken = null;
const token = () => store.get() || memToken;
const setToken = (t) => { memToken = t; store.set(t); };

$("#today").textContent = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
$("#navToggle").addEventListener("click", (e) => { const n = $("#nav"); n.classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", n.classList.contains("open")); });

const pageHead = (title, intro, crumb = title) => `<div class="page-head"><div class="wrap"><div class="crumbs"><a href="#/">Accueil</a> › ${esc(crumb)}</div><h1>${esc(title)}</h1>${intro ? `<p>${intro}</p>` : ""}</div></div>`;
const newsCard = (a) => `<a class="card" href="#/actualite/${a.id}"><div class="card-img">${illustration(a.illustration, a.id)}</div><div class="meta"><span class="cat">${esc(a.categorie)}</span><span class="date">${date(a.date)}</span></div><h3>${esc(a.titre)}</h3><p>${esc(a.chapo)}</p></a>`;
const marcheCard = (m, action = "") => `<div class="lcard"><div class="row" style="display:flex;gap:8px;flex-wrap:wrap">${tag(m.statut)}<span class="tag">${esc(m.filiere)}</span></div>
  <h3>${esc(m.intitule)}</h3><div class="sub">${esc(m.reference)} · ${esc(m.acheteur)} · ${esc(m.region)}</div>
  <div><b>${mfcfa(m.montant)}</b> · date limite : ${date(m.date_limite)}</div><div class="sub">${fmt(m.candidatures ?? 0)} candidature(s) · environ ${fmt(m.quota_artisans)} artisans attendus</div>${action}</div>`;

// ---------------- Pages ----------------
const pages = {
  async ""() {
    const [st, news, marches, r] = await Promise.all([api("/public/stats"), api("/public/actualites"), api("/public/marches"), ref()]);
    const a = st.artisans;
    app.innerHTML = `
      <section class="hero"><svg class="bg" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="hg" x1="0" x2="1"><stop offset="0" stop-color="#062414"/><stop offset=".7" stop-color="#0b4a25"/><stop offset="1" stop-color="#008f36"/></linearGradient></defs><rect width="1200" height="420" fill="url(#hg)"/>
        ${Array.from({ length: 22 }, (_, i) => `<path d="M${700 + (i % 11) * 50} ${i < 11 ? 0 : 420} l25 ${i < 11 ? 45 : -45} l25 ${i < 11 ? -45 : 45}z" fill="${["#008f36", "#ffeb00", "#e1001a"][i % 3]}" opacity=".55"/>`).join("")}
        <circle cx="1010" cy="210" r="120" fill="none" stroke="#ffeb00" stroke-opacity=".35" stroke-width="2"/><circle cx="1010" cy="210" r="80" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/></svg>
        <div class="wrap"><span class="kicker">Agenda national de Transformation</span>
          <h1>Développement et promotion de l'Artisanat national</h1>
          <p>Recensement général des artisans, accès à la commande publique, Fonds spécial de financement et modernisation des Chambres de métiers : un guichet unique pour les artisans du Sénégal.</p>
          <div class="actions"><a class="btn primary" href="#/recensement">Je me fais recenser</a><a class="btn light" href="#/espace">Suivre mon dossier</a></div></div></section>
      <section class="section"><div class="wrap">
        <div class="kpis">
          <div class="kpi"><div class="v">${fmt(a.total)}</div><div class="l">Artisans recensés</div><div class="s">${fmt(a.valides)} dossiers validés</div></div>
          <div class="kpi"><div class="v">${fmt(a.emplois)}</div><div class="l">Emplois déclarés</div><div class="s">dont ${fmt(a.apprentis)} apprentis</div></div>
          <div class="kpi"><div class="v">${fmt(st.commande.marches_ouverts)}</div><div class="l">Marchés réservés ouverts</div><div class="s">${mfcfa(st.commande.montant_ouvert)}</div></div>
          <div class="kpi"><div class="v">${mfcfa(st.financement.ressources).replace(" FCFA", "")}</div><div class="l">Ressources du Fonds spécial (FCFA)</div><div class="s">${fmt(st.financement.cotisants)} artisans cotisants</div></div>
        </div></div></section>
      <section class="section alt"><div class="wrap"><div class="section-title"><h2>Actualités</h2><a class="more" href="#/actualites">Toutes les actualités →</a></div>
        <div class="news-grid">${news.slice(0, 5).map(newsCard).join("")}</div></div></section>
      <section class="section"><div class="wrap"><div class="section-title"><h2>Les quatre prescriptions du Chef de l'État</h2></div>
        <div class="pillars">${r.prescriptions.map((p, i) => `<a class="pillar" href="#/${["recensement", "marches", "fonds", "infrastructures"][i]}"><span class="code">${p.code}</span><h3>${esc(p.titre)}</h3><p>${esc(p.texte)}</p><span class="go">Accéder →</span></a>`).join("")}</div>
        <p class="crumbs" style="margin-top:16px">Source : communication du Président de la République au Conseil des ministres du 28 octobre 2026.</p></div></section>
      <section class="section alt"><div class="wrap"><div class="section-title"><h2>Marchés réservés aux artisans</h2><a class="more" href="#/marches">Tous les marchés →</a></div>
        <div class="list-cards">${marches.filter((m) => m.statut === "ouvert").slice(0, 3).map((m) => marcheCard(m)).join("")}</div></div></section>`;
  },

  async actualites() {
    const news = await api("/public/actualites"); const cats = [...new Set(news.map((n) => n.categorie))];
    app.innerHTML = pageHead("Actualités", "Communiqués, décisions et avancées des programmes de développement de l'Artisanat.") +
      `<section class="section"><div class="wrap"><div class="filters"><select id="cat" aria-label="Catégorie">${options(cats, "", "Toutes les catégories")}</select></div><div class="news-grid" id="list"></div></div></section>`;
    const draw = () => { const c = $("#cat").value; $("#list").innerHTML = news.filter((n) => !c || n.categorie === c).map(newsCard).join("") || "<p>Aucun article.</p>"; };
    $("#cat").addEventListener("change", draw); draw();
  },

  async actualite(id) {
    const [a, news] = await Promise.all([api("/public/actualites/" + encodeURIComponent(id)), api("/public/actualites")]);
    document.title = a.titre + " — Artisanat national";
    app.innerHTML = pageHead(a.titre, `<span class="tag ok">${esc(a.categorie)}</span> &nbsp; ${date(a.date)} · ${esc(a.auteur)}`, "Actualités") +
      `<section class="section"><div class="wrap"><article class="article"><div class="card-img" style="margin-bottom:24px">${illustration(a.illustration, a.id)}</div>
      <p class="lead">${esc(a.chapo)}</p>${a.contenu.split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join("")}</article>
      <div class="section-title" style="margin-top:50px"><h2>À lire aussi</h2></div><div class="list-cards">${news.filter((n) => n.id !== a.id).slice(0, 3).map((n) => newsCard(n)).join("")}</div></div></section>`;
  },

  async recensement() {
    const r = await ref();
    app.innerHTML = pageHead("Recensement général des artisans", "Inscrivez-vous en quelques minutes. Votre dossier est vérifié par la Chambre de métiers de votre région ; vous recevez un numéro d'identification artisan et une carte professionnelle.", "Se faire recenser") + `
      <section class="section"><div class="wrap">
        <ol class="steps"><li class="on">Identité</li><li class="on">Activité</li><li class="on">Besoins</li><li>Validation par la Chambre de métiers</li><li>Carte d'artisan</li></ol>
        <form class="form" id="f" novalidate>
          <fieldset><legend>Identité</legend><div class="fields">
            ${fld("prenom", "Prénom(s)", "text", true)}${fld("nom", "Nom", "text", true)}
            <div class="field"><label>Sexe <span class="req">*</span></label><div class="checks"><label><input type="radio" name="sexe" value="F" required> Femme</label><label><input type="radio" name="sexe" value="M"> Homme</label></div></div>
            ${fld("date_naissance", "Date de naissance", "date", true)}
            ${fld("cni", "N° de carte nationale d'identité (CEDEAO)", "text", true, 'inputmode="numeric" maxlength="20"', "13 à 17 chiffres")}
            ${fld("telephone", "Téléphone", "tel", true, 'inputmode="tel" placeholder="77 123 45 67"', "Sert à suivre votre dossier")}
            ${fld("email", "Adresse électronique", "email", false)}
          </div></fieldset>
          <fieldset><legend>Localisation</legend><div class="fields">
            <div class="field"><label for="region">Région <span class="req">*</span></label><select id="region" name="region" required>${options(Object.keys(r.regions), "", "Choisir…")}</select></div>
            <div class="field"><label for="departement">Département <span class="req">*</span></label><select id="departement" name="departement" required><option value="">Choisir la région d'abord</option></select></div>
            ${fld("commune", "Commune", "text", false)}${fld("adresse", "Adresse de l'atelier", "text", false)}
          </div></fieldset>
          <fieldset><legend>Activité</legend><div class="fields">
            <div class="field"><label for="filiere">Filière <span class="req">*</span></label><select id="filiere" name="filiere" required>${options(Object.keys(r.filieres), "", "Choisir…")}</select></div>
            <div class="field"><label for="metier">Métier <span class="req">*</span></label><select id="metier" name="metier" required><option value="">Choisir la filière d'abord</option></select></div>
            ${fld("enseigne", "Nom de l'atelier / enseigne", "text", false)}
            <div class="field"><label for="statut_juridique">Statut juridique <span class="req">*</span></label><select id="statut_juridique" name="statut_juridique" required>${options(r.statuts_juridiques, "Informel", null)}</select></div>
            ${fld("ninea", "NINEA (si immatriculé)", "text", false)}
            <div class="field"><label for="formation">Formation</label><select id="formation" name="formation">${options(r.formations, "", null)}</select></div>
            ${fld("annees_experience", "Années d'expérience", "number", false, 'min="0" max="80" value="0"')}
            ${fld("apprentis", "Nombre d'apprentis", "number", false, 'min="0" max="200" value="0"')}
            ${fld("employes", "Nombre d'employés", "number", false, 'min="0" max="500" value="0"')}
          </div></fieldset>
          <fieldset><legend>Vos besoins d'accompagnement</legend><div class="checks">${r.besoins.map((b) => `<label><input type="checkbox" name="besoins" data-multi="1" value="${esc(b)}"> ${esc(b)}</label>`).join("")}</div></fieldset>
          <fieldset><legend>Consentement</legend><div class="checks" style="flex-direction:column">
            <label><input type="checkbox" name="visible_annuaire" checked> J'accepte de figurer dans l'annuaire public des artisans (prénom, initiale du nom, métier, commune).</label>
            <label><input type="checkbox" name="consentement" required> J'atteste l'exactitude des informations et j'accepte leur traitement par le Ministère et les Chambres de métiers pour le recensement et l'accompagnement des artisans. <span class="req">*</span></label></div></fieldset>
          <div id="err" aria-live="polite"></div>
          <div><button class="btn primary" type="submit">Envoyer mon dossier</button></div>
        </form></div></section>`;
    chain("#region", "#departement", (v) => r.regions[v] || []); chain("#filiere", "#metier", (v) => r.filieres[v] || []);
    $("#f").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.currentTarget; const d = formData(f);
      if (!f.checkValidity()) { f.reportValidity(); return; }
      const btn = f.querySelector("button[type=submit]"); btn.disabled = true;
      try {
        const res = await api("/public/enrolement", { method: "POST", body: d }); setToken(res.token);
        app.innerHTML = pageHead("Dossier enregistré", "", "Se faire recenser") + `<section class="section"><div class="wrap"><div class="notice">
          <h2 style="margin-top:0">Votre numéro d'identification artisan : <span style="font-family:Consolas,monospace">${esc(res.numero)}</span></h2>
          <p>Conservez ce numéro. Avec votre téléphone, il vous permet de suivre votre dossier. La Chambre de métiers de votre région vérifie vos informations ; vous serez informé(e) de sa décision dans votre espace.</p>
          <a class="btn primary" href="#/espace">Accéder à mon espace</a></div></div></section>`;
        window.scrollTo(0, 0);
      } catch (err) { $("#err").innerHTML = `<div class="notice err">${esc(err.message)}</div>`; btn.disabled = false; }
    });
  },

  async marches() {
    const [list, r] = await Promise.all([api("/public/marches"), ref()]);
    app.innerHTML = pageHead("Commande publique réservée aux artisans", "Avis publiés par l'APDA, le projet du Mobilier national et les administrations. Les candidatures se déposent depuis votre espace artisan (dossier validé requis).", "Commande publique") + `
      <section class="section"><div class="wrap"><div class="filters"><select id="fl">${options(Object.keys(r.filieres), "", "Toutes les filières")}</select><select id="st"><option value="">Tous les statuts</option><option value="ouvert">Ouverts</option><option value="clos">Clos</option><option value="attribue">Attribués</option></select></div>
      <div class="list-cards" id="list"></div></div></section>`;
    const draw = () => { const fl = $("#fl").value, st = $("#st").value; $("#list").innerHTML = list.filter((m) => (!fl || m.filiere === fl) && (!st || m.statut === st))
      .map((m) => marcheCard(m, `<p class="sub">${esc(m.description)}</p><div class="foot">${m.statut === "ouvert" ? `<a class="btn primary" href="#/espace/marches">Candidater</a>` : ""}</div>`)).join("") || "<p>Aucun marché.</p>"; };
    $("#fl").addEventListener("change", draw); $("#st").addEventListener("change", draw); draw();
  },

  async fonds() {
    const st = await api("/public/stats"); const f = st.financement; const r = await ref();
    app.innerHTML = pageHead("Fonds spécial pour le financement de l'Artisanat", "Le Fonds intègre les initiatives actuelles de l'État et la mobilisation solidaire des apports directs des artisans.", "Fonds spécial") + `
      <section class="section"><div class="wrap">
        <div class="kpis"><div class="kpi"><div class="v">${mfcfa(f.ressources)}</div><div class="l">Ressources mobilisées</div></div>
          <div class="kpi"><div class="v">${mfcfa(f.apports_artisans)}</div><div class="l">Apports solidaires des artisans</div><div class="s">${fmt(f.cotisants)} cotisants</div></div>
          <div class="kpi"><div class="v">${fmt(f.accordees)}</div><div class="l">Financements accordés</div><div class="s">${mfcfa(f.engage)} engagés</div></div>
          <div class="kpi"><div class="v">${fmt(f.en_cours)}</div><div class="l">Demandes en instruction</div></div></div>
        <div class="pillars" style="margin-top:34px;grid-template-columns:repeat(3,1fr)">
          <div class="pillar"><span class="code">1</span><h3>Être recensé et validé</h3><p>Le numéro d'artisan validé par la Chambre de métiers est la condition d'accès au Fonds.</p></div>
          <div class="pillar"><span class="code">2</span><h3>Cotiser (apport solidaire)</h3><p>Chaque artisan contribue selon ses moyens, à partir de 500 FCFA. Les apports renforcent la capacité du Fonds.</p></div>
          <div class="pillar"><span class="code">3</span><h3>Déposer une demande</h3><p>Instruments : ${esc(r.instruments.join(", "))}. Instruction par le comité du Fonds.</p></div></div>
        <p style="margin-top:28px"><a class="btn primary" href="#/espace/financement">Demander un financement</a> <a class="btn" href="#/espace/apport">Faire un apport solidaire</a></p></div></section>`;
  },

  async infrastructures() {
    const [sites, r] = await Promise.all([api("/public/sites"), ref()]);
    const v = sites.filter((s) => s.type === "village");
    app.innerHTML = pageHead("Chambres de métiers et villages artisanaux", "Modernisation des infrastructures, équipements et parcs logistiques des Chambres de métiers ; régularisation foncière des sites abritant les villages artisanaux.", "Infrastructures") + `
      <section class="section"><div class="wrap">
        <div class="kpis"><div class="kpi"><div class="v">${sites.filter((s) => s.type === "chambre").length}</div><div class="l">Chambres de métiers</div></div>
          <div class="kpi"><div class="v">${v.length}</div><div class="l">Villages artisanaux suivis</div></div>
          <div class="kpi"><div class="v">${v.filter((s) => foncierClass(s.statut_foncier) === "pos").length}</div><div class="l">Sites au foncier sécurisé</div></div>
          <div class="kpi"><div class="v">${v.filter((s) => s.statut_foncier === "Non régularisé").length}</div><div class="l">Sites non régularisés</div><div class="s" style="color:var(--red)">Priorité de régularisation</div></div></div>
        <div class="filters" style="margin-top:30px"><select id="ty"><option value="">Tous les sites</option><option value="chambre">Chambres de métiers</option><option value="village">Villages artisanaux</option></select><select id="rg">${options(Object.keys(r.regions), "", "Toutes les régions")}</select></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Site</th><th>Région</th><th>Statut foncier</th><th>État</th><th>Projet en cours</th><th>Avancement</th></tr></thead><tbody id="rows"></tbody></table></div></div></section>`;
    const draw = () => { const ty = $("#ty").value, rg = $("#rg").value; $("#rows").innerHTML = sites.filter((s) => (!ty || s.type === ty) && (!rg || s.region === rg)).map((s) => `<tr>
      <td><b>${esc(s.nom)}</b><br><small>${fmt(s.ateliers)} ateliers · ${fmt(s.superficie_m2)} m²</small></td><td>${esc(s.region)}</td>
      <td><span class="tag ${{ pos: "ok", neg: "ko", crit: "wait" }[foncierClass(s.statut_foncier)]}">${esc(s.statut_foncier)}</span></td><td>${tag(s.etat)}</td><td>${esc(s.projet)}</td>
      <td style="min-width:120px"><div class="progress"><i style="width:${s.avancement}%"></i></div><small>${s.avancement} %</small></td></tr>`).join(""); };
    $("#ty").addEventListener("change", draw); $("#rg").addEventListener("change", draw); draw();
  },

  async annuaire() {
    const r = await ref();
    app.innerHTML = pageHead("Annuaire des artisans", "Trouvez un artisan recensé et validé près de chez vous. Seuls les artisans ayant donné leur accord y figurent.", "Annuaire") + `
      <section class="section"><div class="wrap"><form class="filters" id="f"><input name="q" placeholder="Nom, métier, commune…" aria-label="Recherche"><select name="region">${options(Object.keys(r.regions), "", "Toutes les régions")}</select>
        <select name="filiere">${options(Object.keys(r.filieres), "", "Toutes les filières")}</select></form><p id="count" class="crumbs"></p><div class="list-cards" id="list"></div></div></section>`;
    let timer; const draw = async () => { const q = new URLSearchParams(formData($("#f"))); const res = await api("/public/annuaire?" + q);
      $("#count").textContent = `${fmt(res.total)} artisan(s)${res.total > res.items.length ? ` — ${res.items.length} premiers affichés` : ""}`;
      $("#list").innerHTML = res.items.map((a) => `<div class="lcard"><span class="tag ok">${esc(a.filiere)}</span><h3>${esc(a.enseigne || a.nom)}</h3><div><b>${esc(a.metier)}</b> · ${esc(a.nom)}</div>
        <div class="sub">${esc(a.commune)}, ${esc(a.region)} · ${fmt(a.annees_experience)} ans d'expérience</div><div class="foot"><span class="sub">N° ${esc(a.numero)}</span></div></div>`).join("") || "<p>Aucun résultat.</p>"; };
    $("#f").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(draw, 250); }); $("#f").addEventListener("submit", (e) => e.preventDefault()); draw();
  },

  async espace(tab = "dossier") {
    if (!token()) return loginArtisan(tab);
    let me; try { me = await api("/me", { token: token() }); } catch (e) { if (e.status === 401) { setToken(null); return loginArtisan(tab); } throw e; }
    const a = me.artisan; const valide = a.statut === "valide";
    const tabs = [["dossier", "Mon dossier"], ["marches", "Marchés"], ["financement", "Financement"], ["apport", "Apport solidaire"], ["profil", "Mes informations"]];
    app.innerHTML = pageHead(`Espace artisan — ${a.prenom} ${a.nom}`, `N° ${esc(a.numero)} · ${esc(a.metier)} · ${esc(a.region)} &nbsp; ${tag(a.statut)}`, "Mon espace") + `
      <section class="section"><div class="wrap"><nav class="filters no-print" style="gap:6px">${tabs.map(([k, l]) => `<a class="btn${k === tab ? " primary" : ""}" href="#/espace/${k}">${l}</a>`).join("")}<button class="btn" id="logout" style="flex:0">Se déconnecter</button></nav>
      ${!valide ? `<div class="notice ${a.statut === "rejete" ? "err" : "warn"}" style="margin-bottom:22px">${a.statut === "rejete" ? `Votre dossier a été rejeté. Motif : <b>${esc(a.motif)}</b>. Rapprochez-vous de la Chambre de métiers de ${esc(a.region)}.` : "Votre dossier est en cours de vérification par la Chambre de métiers. Les marchés réservés et le Fonds spécial seront accessibles après validation."}</div>` : ""}
      <div id="tab"></div></div></section>`;
    $("#logout").addEventListener("click", () => { setToken(null); location.hash = "#/"; });
    const T = $("#tab");
    if (tab === "dossier") {
      T.innerHTML = `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:30px" class="dossier">
        <div>${valide ? carte(a) : `<div class="notice warn">La carte d'artisan est délivrée après validation du dossier.</div>`}${valide ? `<p class="no-print"><button class="btn" id="print">Imprimer ma carte</button></p>` : ""}</div>
        <div><table class="table"><tbody>${[["Statut", tag(a.statut)], ["Inscrit le", date(a.date_inscription)], ["Décision", a.date_decision ? date(a.date_decision) : "—"], ["Filière", esc(a.filiere)], ["Métier", esc(a.metier)], ["Statut juridique", esc(a.statut_juridique)],
          ["Atelier", esc(a.enseigne || "—")], ["Village artisanal", esc(me.site?.nom || "—")], ["Candidatures", fmt(me.candidatures.length)], ["Demandes de financement", fmt(me.financements.length)], ["Apports au Fonds", fcfa(me.contributions.reduce((x, c) => x + c.montant, 0))]]
          .map(([k, v]) => `<tr><th style="width:45%;border-bottom:1px solid var(--line)">${k}</th><td>${v}</td></tr>`).join("")}</tbody></table></div></div>`;
      $("#print")?.addEventListener("click", () => window.print());
      if (matchMedia("(max-width: 800px)").matches) T.firstElementChild.style.gridTemplateColumns = "1fr";
    }
    if (tab === "marches") {
      const all = await api("/public/marches"); const done = new Set(me.candidatures.map((c) => c.marche_id));
      const elig = all.filter((m) => m.statut === "ouvert" && m.filiere === a.filiere && (m.region === "Toutes régions" || m.region === a.region));
      T.innerHTML = `<h2>Mes candidatures</h2>${me.candidatures.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Marché</th><th>Offre</th><th>Délai</th><th>Statut</th></tr></thead><tbody>${me.candidatures.map((c) => `<tr><td>${esc(c.marche?.intitule)}<br><small>${esc(c.marche?.reference)}</small></td><td>${fcfa(c.montant)}</td><td>${c.delai_jours} j</td><td>${tag(c.statut)}</td></tr>`).join("")}</tbody></table></div>` : "<p>Aucune candidature.</p>"}
        <h2 style="margin-top:36px">Marchés ouverts à votre profil (${esc(a.filiere)}, ${esc(a.region)})</h2><div class="list-cards">${elig.map((m) => marcheCard(m, done.has(m.id) ? `<div class="foot"><span class="tag ok">Candidature déposée</span></div>` : valide ? `
          <form class="foot k" data-id="${m.id}" style="flex-direction:column;align-items:stretch;gap:8px"><div class="field"><label>Montant de l'offre (FCFA)</label><input name="montant" type="number" min="1" max="${m.montant}" required></div>
          <div class="field"><label>Délai d'exécution (jours)</label><input name="delai_jours" type="number" min="1" max="365" value="30" required></div><div class="field"><label>Note (capacité, références)</label><textarea name="note" rows="2"></textarea></div><button class="btn primary">Déposer ma candidature</button></form>` : "")).join("") || "<p>Aucun marché ouvert pour votre filière et votre région actuellement.</p>"}</div>`;
      $$("form.k", T).forEach((f) => f.addEventListener("submit", async (e) => { e.preventDefault(); try { await api("/me/candidatures", { method: "POST", token: token(), body: { ...formData(f), marche_id: Number(f.dataset.id) } }); toast("Candidature déposée."); pages.espace("marches"); } catch (err) { toast(err.message, true); } }));
    }
    if (tab === "financement") {
      const r = await ref();
      T.innerHTML = `<h2>Mes demandes</h2>${me.financements.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Référence</th><th>Objet</th><th>Demandé</th><th>Accordé</th><th>Statut</th></tr></thead><tbody>${me.financements.map((f) => `<tr><td>${esc(f.reference)}<br><small>${date(f.date)}</small></td><td>${esc(f.instrument)}<br><small>${esc(f.objet)}</small></td><td>${fcfa(f.montant_demande)}</td><td>${f.montant_accorde ? fcfa(f.montant_accorde) : "—"}</td><td>${tag(f.statut)}${f.motif ? `<br><small>${esc(f.motif)}</small>` : ""}</td></tr>`).join("")}</tbody></table></div>` : "<p>Aucune demande.</p>"}
        ${valide ? `<h2 style="margin-top:36px">Nouvelle demande au Fonds spécial</h2><form class="form" id="fin"><fieldset><legend>Demande</legend><div class="fields">
          <div class="field"><label>Instrument <span class="req">*</span></label><select name="instrument" required>${options(r.instruments, "", null)}</select></div>
          ${fld("montant_demande", "Montant demandé (FCFA)", "number", true, 'min="50000" max="50000000" step="1000"')}
          ${fld("apport_personnel", "Apport personnel (FCFA)", "number", false, 'min="0" value="0"')}${fld("duree_mois", "Durée de remboursement (mois)", "number", false, 'min="3" max="84" value="24"')}
          <div class="field full"><label>Objet du financement <span class="req">*</span></label><textarea name="objet" rows="3" required placeholder="Ex. : acquisition d'une machine à coudre industrielle"></textarea></div></div></fieldset>
          <div><button class="btn primary">Envoyer ma demande</button></div></form>` : ""}`;
      $("#fin")?.addEventListener("submit", async (e) => { e.preventDefault(); try { await api("/me/financements", { method: "POST", token: token(), body: formData(e.currentTarget) }); toast("Demande envoyée."); pages.espace("financement"); } catch (err) { toast(err.message, true); } });
    }
    if (tab === "apport") {
      const total = me.contributions.reduce((x, c) => x + c.montant, 0);
      T.innerHTML = `<div class="notice">L'apport solidaire alimente le Fonds spécial pour le financement de l'Artisanat. Total de vos apports : <b>${fcfa(total)}</b>.</div>
        ${valide ? `<form class="form" id="ap" style="margin-top:20px"><fieldset><legend>Nouvel apport</legend><div class="fields">${fld("montant", "Montant (FCFA)", "number", true, 'min="500" max="5000000" step="500" value="5000"')}
          <div class="field"><label>Moyen de paiement</label><select name="libelle"><option>Apport solidaire — Mobile money</option><option>Apport solidaire — Guichet Chambre de métiers</option></select><div class="hint">Démonstration : aucun paiement réel n'est effectué.</div></div></div></fieldset><div><button class="btn primary">Enregistrer l'apport</button></div></form>` : ""}
        <h2 style="margin-top:30px">Historique</h2>${me.contributions.length ? `<table class="table"><tbody>${me.contributions.map((c) => `<tr><td>${date(c.date)}</td><td>${esc(c.libelle)}</td><td style="text-align:right">${fcfa(c.montant)}</td></tr>`).join("")}</tbody></table>` : "<p>Aucun apport.</p>"}`;
      $("#ap")?.addEventListener("submit", async (e) => { e.preventDefault(); try { await api("/me/contributions", { method: "POST", token: token(), body: formData(e.currentTarget) }); toast("Merci pour votre apport."); pages.espace("apport"); } catch (err) { toast(err.message, true); } });
    }
    if (tab === "profil") {
      const r = await ref();
      T.innerHTML = `<form class="form" id="pf"><fieldset><legend>Coordonnées</legend><div class="fields">${fld("telephone", "Téléphone", "tel", true, `value="${esc(a.telephone)}"`)}${fld("email", "Adresse électronique", "email", false, `value="${esc(a.email)}"`)}
        ${fld("adresse", "Adresse de l'atelier", "text", false, `value="${esc(a.adresse)}"`)}${fld("enseigne", "Enseigne", "text", false, `value="${esc(a.enseigne)}"`)}</div></fieldset>
        <fieldset><legend>Besoins</legend><div class="checks">${r.besoins.map((b) => `<label><input type="checkbox" name="besoins" data-multi="1" value="${esc(b)}"${a.besoins.includes(b) ? " checked" : ""}> ${esc(b)}</label>`).join("")}</div></fieldset>
        <fieldset><legend>Annuaire</legend><label><input type="checkbox" name="visible_annuaire"${a.visible_annuaire ? " checked" : ""}> Figurer dans l'annuaire public</label></fieldset>
        <p class="crumbs">Pour modifier votre identité, votre métier ou votre région, adressez-vous à la Chambre de métiers.</p><div><button class="btn primary">Enregistrer</button></div></form>`;
      $("#pf").addEventListener("submit", async (e) => { e.preventDefault(); try { await api("/me", { method: "PATCH", token: token(), body: formData(e.currentTarget) }); toast("Informations mises à jour."); } catch (err) { toast(err.message, true); } });
    }
  },
};

function loginArtisan(tab) {
  app.innerHTML = pageHead("Suivre mon dossier", "Saisissez votre numéro d'identification artisan et le téléphone déclaré lors du recensement.", "Mon espace") + `
    <section class="section"><div class="wrap"><form class="form" id="lg" style="max-width:560px"><fieldset><legend>Connexion à l'espace artisan</legend><div class="fields" style="grid-template-columns:1fr">
      ${fld("numero", "Numéro d'artisan", "text", true, 'placeholder="ART-2026-THI-00001" autocomplete="username"')}${fld("telephone", "Téléphone", "tel", true, 'placeholder="77 123 45 67"')}</div></fieldset>
      <div id="err" aria-live="polite"></div><div><button class="btn primary">Accéder à mon espace</button> <a class="btn" href="#/recensement">Pas encore recensé ?</a></div>
      <p class="crumbs">Démonstration : <button type="button" class="btn" id="demo" style="padding:4px 12px">Remplir avec un compte de démonstration</button></p></form></div></section>`;
  $("#demo").addEventListener("click", async () => { const res = await api("/public/annuaire?q=awa%20couture"); const n = res.items[0]?.numero; if (n) { $("#lg").numero.value = n; $("#lg").telephone.value = "77 123 45 67"; } });
  $("#lg").addEventListener("submit", async (e) => { e.preventDefault(); try { const res = await api("/public/suivi", { method: "POST", body: formData(e.currentTarget) }); setToken(res.token); pages.espace(tab); } catch (err) { $("#err").innerHTML = `<div class="notice err">${esc(err.message)}</div>`; } });
}

function carte(a) {
  return `<div class="carte" aria-label="Carte professionnelle d'artisan"><div class="band"></div><div class="ch"><img src="/embleme.svg" alt=""><div>République du Sénégal<br>Carte professionnelle d'artisan<br><span style="color:#5c5c5c">Chambre de métiers de ${esc(a.region)}</span></div></div>
    <div class="cb"><div><div class="nm">${esc(a.prenom)} ${esc(a.nom)}</div><div class="mt">${esc(a.metier)}</div><div class="sm">${esc(a.filiere)} · ${esc(a.commune)}</div><div class="num">${esc(a.numero)}</div><div class="sm">Validée le ${date(a.date_decision)}</div></div>
    ${codeVisuel(a.numero)}</div></div>`;
}
// Motif de contrôle visuel dérivé du numéro (non lisible par machine : l'authenticité se vérifie par le numéro auprès de la Chambre de métiers)
function codeVisuel(s) { let h = 2166136261; let cells = ""; for (let i = 0; i < 49; i++) { h ^= s.charCodeAt(i % s.length) + i; h = Math.imul(h, 16777619) >>> 0; if (h % 2 || [0, 6, 42, 48].includes(i)) cells += `<rect x="${(i % 7) * 10}" y="${Math.floor(i / 7) * 10}" width="10" height="10"/>`; }
  return `<svg class="qr" viewBox="0 0 70 70" aria-hidden="true"><g fill="#1a171b">${cells}</g></svg>`; }

function fld(name, label, type, req, attrs = "", hint = "") {
  return `<div class="field"><label for="${name}">${label}${req ? ' <span class="req">*</span>' : ""}</label><input id="${name}" name="${name}" type="${type}"${req ? " required" : ""} ${attrs}>${hint ? `<div class="hint">${hint}</div>` : ""}</div>`;
}
function chain(src, dst, list) { $(src).addEventListener("change", (e) => { $(dst).innerHTML = options(list(e.target.value), "", "Choisir…"); }); }

async function router() {
  const [, name = "", arg] = location.hash.replace(/^#/, "").split("/");
  $$("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.r === name || (name === "actualite" && a.dataset.r === "actualites")));
  $("#nav").classList.remove("open");
  document.title = "Développement et promotion de l'Artisanat national";
  const page = pages[name];
  try { if (page) await page(arg); else app.innerHTML = pageHead("Page introuvable", `<a href="#/">Retour à l'accueil</a>`); }
  catch (e) { app.innerHTML = `<div class="wrap section"><div class="notice err">${esc(e.message)}</div></div>`; }
  if (!arg || name !== "espace") window.scrollTo(0, 0);
}
addEventListener("hashchange", router); router();
