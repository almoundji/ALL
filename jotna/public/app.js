/* Jotna – interface (Fiori) branchée sur /api. Aucune dépendance. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)).replace(/\s/g, ' ') + ' FCFA';
  const fdate = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
  const initials = (n) => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
  const monthLabel = (m) => { const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  const STATUS = { paye: 'Payé', partiel: 'Partiel', retard: 'En retard', avenir: 'À venir', aucun: 'Sans contrat' };
  const TYPES = { ecole: 'École', bailleur: 'Bailleur / résidence', salle: 'Salle de sport / club', autre: 'Autre activité récurrente' };
  const app = $('#app');
  const state = { me: null, tenant: null, admin: false, config: {}, month: new Date().toISOString().slice(0, 7), view: 'accueil', payerId: null, selected: new Set(), filters: { q: '', group: '', status: '' }, encTab: 'tous', loginTab: 'login', dismissed: false };
  const V = () => state.tenant.vocab;

  // ---------- Réseau ----------
  async function api(method, path, data) {
    const res = await fetch(path, { method, headers: data !== undefined ? { 'content-type': 'application/json' } : {}, body: data !== undefined ? JSON.stringify(data) : undefined, credentials: 'same-origin' });
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('json') ? await res.json() : await res.text();
    if (res.status === 401 && state.me) { state.me = null; route('connexion'); }
    if (!res.ok) throw new Error(body && body.error ? body.error : `Erreur ${res.status}`);
    return body;
  }
  let toastT;
  function toast(msg, long) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), long ? 5000 : 2800); }
  const fail = (e) => toast(e.message || String(e), true);

  // ---------- Dialogue ----------
  let dlgOk = null;
  function openDialog(title, body, okLabel, onOk, cancelLabel) {
    $('#dlgTitle').textContent = title; $('#dlgBody').innerHTML = body; $('#dlgOk').textContent = okLabel || 'Enregistrer'; $('#dlgCancel').textContent = cancelLabel || 'Annuler'; $('#dlgOk').hidden = !onOk; dlgOk = onOk;
    const d = $('#dlg'); if (!d.open) d.showModal(); const f = d.querySelector('input, select, textarea'); if (f) f.focus();
  }
  $('#dlgCancel').addEventListener('click', () => $('#dlg').close());
  $('#dlgOk').addEventListener('click', async () => { try { if (!dlgOk || (await dlgOk()) !== false) $('#dlg').close(); } catch (e) { fail(e); } });
  const field = (id, label, type = 'text', value = '', extra = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value)}" ${extra}></div>`;
  const select = (id, label, opts, value = '') => `<div class="field"><label for="${id}">${label}</label><select id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  const val = (id) => ($('#' + id) ? $('#' + id).value.trim() : '');
  function copy(text) { const done = () => toast('Copié.'); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => toast('Sélectionnez et copiez le texte.')); else toast('Sélectionnez et copiez le texte.'); }

  // ---------- Routage ----------
  const VIEWS = ['accueil', 'payeurs', 'payeur', 'echeances', 'encaissements', 'rapprochement', 'relances', 'parametres', 'admin', 'connexion'];
  function route(v) { if (!VIEWS.includes(v)) v = 'accueil'; if (location.hash !== '#' + v) location.hash = v; else render(); }
  window.addEventListener('hashchange', render);
  async function render() {
    let v = (location.hash || '#accueil').slice(1).replace(/[^a-z-]/g, '') || 'accueil';
    if (!state.me && (v === 'demo-ecole' || v === 'demo-bailleur')) { try { await login(v + '@jotna.sn', 'demo2026'); return; } catch (e) { fail(e); v = 'connexion'; } }
    if (!state.me && v === 'inscription') { state.loginTab = 'signup'; v = 'connexion'; }
    v = v.replace(/-/g, '');
    state.view = state.me ? (v === 'connexion' ? 'accueil' : v) : 'connexion';
    $('#shell').hidden = !state.me;
    window.scrollTo(0, 0);
    try {
      if (state.view === 'connexion') return renderLogin();
      $('#crumb').textContent = `${state.tenant.name}${state.tenant.city ? ' · ' + state.tenant.city : ''}`;
      $('#monthPick').value = state.month; $('#btnUser').textContent = initials(state.me.name);
      const fn = { accueil: renderHome, payeurs: renderPayers, payeur: renderPayer, echeances: renderInstallments, encaissements: renderPayments, rapprochement: renderReconcile, relances: renderReminders, parametres: renderSettings, admin: renderAdmin }[state.view];
      state.rid = (state.rid || 0) + 1; await fn(state.rid);
    } catch (e) { fail(e); app.innerHTML = `<div class="page gutter"><div class="empty">${esc(e.message)}</div></div>`; }
  }
  const bc = (title) => `<div class="bc"><a href="#accueil">Accueil</a> › ${esc(title)}</div>`;
  const dpHead = (title, sub, actions = '', extra = '') => `<div class="dp-head"><div class="inner gutter"><div class="dp-title"><div>${bc(title)}<h1>${esc(title)}</h1><div class="sub">${sub}</div></div><div class="actions">${actions}</div></div>${extra}</div></div>`;
  const st = (s, extra = '') => `<span class="st ${s}">${STATUS[s] || s}</span>${extra}`;
  const monthNote = () => `${monthLabel(state.month)} · échéance le ${state.tenant.dueDay}`;

  // ---------- Connexion / inscription ----------
  function renderLogin() {
    const tab = state.loginTab;
    app.innerHTML = `<div class="login"><div class="box">
      <div class="logo"><span class="mark">J</span>Jotna</div>
      <p class="tag">Suivi des mensualités, loyers et cotisations sur PI-SPI. Pointage automatique, relances WhatsApp, reçus.</p>
      <div class="tabs" style="margin-top:0"><button class="${tab === 'login' ? 'on' : ''}" data-tab="login">Connexion</button><button class="${tab === 'signup' ? 'on' : ''}" data-tab="signup">Créer un établissement</button></div>
      <form id="loginForm" style="margin-top:1rem" ${tab !== 'login' ? 'hidden' : ''}>
        ${field('lEmail', 'E-mail', 'email', '', 'autocomplete="username" required')}${field('lPwd', 'Mot de passe', 'password', '', 'autocomplete="current-password" required')}
        <div class="err" id="lErr"></div><button class="btn emph" type="submit">Se connecter</button>
      </form>
      <form id="signupForm" style="margin-top:1rem" ${tab !== 'signup' ? 'hidden' : ''}>
        ${field('sEst', "Nom de l'établissement", 'text', '', 'required placeholder="École Les Pédagogues, Résidence Soleil…"')}
        ${select('sType', 'Activité', Object.entries(TYPES), 'ecole')}
        ${field('sAlias', 'Alias PI-SPI de l\'établissement (facultatif, modifiable)', 'text', '', 'placeholder="ex. keur-xaleyi"')}
        ${field('sDue', 'Jour d\'échéance mensuelle', 'number', '5', 'min="1" max="28"')}
        ${field('sPhone', 'Téléphone de l\'établissement (WhatsApp)', 'tel', '', 'placeholder="77 000 00 00"')}${field('sName', 'Votre nom', 'text', '', 'autocomplete="name"')}${field('sEmail', 'E-mail', 'email', '', 'autocomplete="username" required')}${field('sPwd', 'Mot de passe (8 caractères minimum)', 'password', '', 'autocomplete="new-password" required minlength="8"')}
        <div class="err" id="sErr"></div><button class="btn emph" type="submit">Créer et essayer 30 jours</button>
        <div class="muted" style="font-size:.8125rem">Essai gratuit. Aucun argent ne transite par Jotna : les paiements vont directement sur votre compte.</div>
      </form>
      <div class="demo">Voir Jotna avec des données fictives :<div class="row"><button class="btn sm" data-demo="demo-ecole@jotna.sn">Démo école</button><button class="btn sm" data-demo="demo-bailleur@jotna.sn">Démo résidence</button></div>${waSupport() ? `<div class="row"><a class="btn sm" href="${esc(waSupport())}" target="_blank" rel="noopener">Une question ? Support WhatsApp</a><a class="btn sm ghost" href="/">Présentation de Jotna</a></div>` : '<div class="row"><a class="btn sm ghost" href="/">Présentation de Jotna</a></div>'}</div>
    </div></div>`;
    $$('[data-tab]', app).forEach((b) => b.addEventListener('click', () => { state.loginTab = b.dataset.tab; renderLogin(); }));
    $('#loginForm').addEventListener('submit', async (e) => { e.preventDefault(); try { await login(val('lEmail'), $('#lPwd').value); } catch (er) { $('#lErr').textContent = er.message; } });
    $('#signupForm').addEventListener('submit', async (e) => { e.preventDefault(); try { const r = await api('POST', '/api/auth/signup', { establishment: val('sEst'), type: val('sType'), alias: val('sAlias'), dueDay: Number(val('sDue')) || 5, phone: val('sPhone'), name: val('sName'), email: val('sEmail'), password: $('#sPwd').value }); setSession(r); toast(`Bienvenue. ${r.tenant.name} est créé, essai jusqu'au ${fdate(r.tenant.trialEnds)}.`, true); route('accueil'); } catch (er) { $('#sErr').textContent = er.message; } });
    $$('[data-demo]', app).forEach((b) => b.addEventListener('click', async () => { try { await login(b.dataset.demo, 'demo2026'); } catch (er) { $('#lErr').textContent = er.message; } }));
  }
  async function login(email, password) { const r = await api('POST', '/api/auth/login', { email, password }); setSession(r); route('accueil'); }
  function setSession(r) { state.me = r.user; state.tenant = r.tenant; state.admin = r.admin; state.dismissed = false; if (r.config) state.config = r.config; supportButton(); }
  const waSupport = () => { const d = String(state.config.supportWhatsapp || '').replace(/\D/g, ''); return d ? `https://wa.me/${d.startsWith('221') ? d : '221' + d}?text=${encodeURIComponent('Bonjour Jotna, ')}` : ''; };
  function supportButton() { let b = $('#support'); if (!b) { b = document.createElement('a'); b.id = 'support'; b.className = 'support'; b.target = '_blank'; b.rel = 'noopener'; b.innerHTML = '<svg><use href="#i-chat"/></svg><span>Support WhatsApp</span>'; document.body.appendChild(b); } const l = waSupport(); b.hidden = !l; b.href = l || '#'; }

  // ---------- Accueil ----------
  async function renderHome(rid) {
    const d = await api('GET', `/api/dashboard?month=${state.month}`); if (rid && rid !== state.rid) return;
    const v = V(); const trialDays = Math.ceil((Date.parse(d.trialEnds) - Date.now()) / 86400000);
    const strip = state.tenant.demo ? `<div class="strip"><span class="dot"></span><span>Établissement de démonstration : toutes les données sont fictives. <button class="btn sm ghost" id="btnReset">Réinitialiser la démo</button></span></div>`
      : d.plan === 'essai' ? `<div class="strip ${trialDays <= 7 ? 'warn' : ''}"><span class="dot"></span><span>Essai gratuit jusqu'au ${fdate(d.trialEnds)} (${Math.max(0, trialDays)} jours). Ensuite 25 000 FCFA par mois et par établissement.</span></div>`
      : d.plan === 'suspendu' ? `<div class="strip warn"><span class="dot"></span><span>Abonnement suspendu : lecture seule. Contactez Jotna pour réactiver.</span></div>` : '';
    const ob = d.onboarding || state.tenant.onboarding || {}; state.tenant.onboarding = ob; const steps = [['settings', 'Vérifier l\'alias PI-SPI et le jour d\'échéance', `Alias actuel : ${state.tenant.alias} · échéance le ${state.tenant.dueDay}`, '#parametres', 'Vérifier'], ['payers', `Ajouter vos ${v.payers.toLowerCase()}`, 'Saisie un par un ou import de votre liste (CSV, Excel)', '#payeurs', 'Ajouter'], ['informed', 'Informer les payeurs', 'Message WhatsApp prêt : alias, référence, jour d\'échéance', 'informed', 'Voir le message'], ['first', 'Suivre la première échéance', 'Importer un relevé ou saisir un paiement : le statut passe à Payé', '#encaissements', 'Encaissements']];
    const done = steps.filter(([k]) => ob[k]).length;
    const onboarding = !state.tenant.demo && !ob.dismissed && done < steps.length ? `<div class="panel" style="margin-top:.75rem"><div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap"><h2 style="font-size:1rem;margin:0">Démarrage : ${done} / ${steps.length} étapes</h2><span class="muted">Trente minutes suffisent pour suivre votre prochaine échéance.</span><span class="spacer" style="flex:1"></span>${waSupport() ? `<a class="btn sm" href="${esc(waSupport())}" target="_blank" rel="noopener">Aide par WhatsApp</a>` : ''}<button class="btn sm ghost" id="obDismiss">Masquer</button></div><div class="steps-ob">${steps.map(([k, t, sub, href, lbl], i) => `<div class="ob ${ob[k] ? 'done' : ''}"><span class="ob-n">${ob[k] ? '✓' : i + 1}</span><div style="min-width:0"><div class="main">${t}</div><div class="sub">${sub}</div></div>${ob[k] ? '' : href === 'informed' ? `<button class="btn sm emph" id="obInformed">${lbl}</button>` : `<a class="btn sm ${i === done ? 'emph' : ''}" href="${href}">${lbl}</a>`}</div>`).join('')}</div></div>` : '';
    const empty = d.contracts === 0 && (state.tenant.demo || ob.dismissed) ? `<div class="strip"><span class="dot"></span><span>Commencez par ajouter vos ${v.payers.toLowerCase()} : <a href="#payeurs">saisie ou import d'un fichier</a>.${state.me.role === 'gestionnaire' ? ` Ou <button class="btn sm ghost" id="btnLoadDemo">chargez des données d'exemple</button> pour découvrir l'outil.` : ''}</span></div>` : '';
    app.innerHTML = `<div class="page gutter">${strip}${onboarding}${empty}
      <div class="lp-head"><h1>Bonjour, ${esc(state.me.name)}</h1><div class="muted">${esc(d.monthLabel)} · ${d.contracts} ${v.contracts.toLowerCase()} · ${d.paye} payés, ${d.partiel} partiels, ${d.retard} en retard, ${d.avenir} à venir · échéance le ${fdate(d.dueDate)}</div></div>
      <div class="group"><h2>Suivi du mois</h2><div class="tiles">
        <button class="tile ${d.rate >= 80 ? 'pos' : d.rate >= 50 ? 'crit' : 'neg'}" data-go="echeances"><span class="t">Taux de recouvrement</span><span class="s">${esc(d.monthLabel)}</span><span class="kpi"><span class="v num">${d.rate}</span><span class="u">%</span></span><span class="ft">${fmt(d.received)} sur ${fmt(d.expected)}</span></button>
        <button class="tile" data-go="encaissements"><span class="t">Encaissé</span><span class="s">Sur ${fmt(d.expected)} attendus</span><span class="kpi"><span class="v num">${(d.received / 1e6).toFixed(2).replace('.', ',')}</span><span class="u">M FCFA</span></span><span class="ft">${d.paye + d.partiel} paiements ce mois</span></button>
        <button class="tile ${d.retard ? 'neg' : 'pos'}" data-go="payeurs" data-status="retard"><span class="t">En retard</span><span class="s">Échéance du ${fdate(d.dueDate)}</span><span class="kpi"><span class="v num">${d.retard}</span><span class="u">${v.contracts.toLowerCase()}</span></span><span class="ft">${fmt(d.dueLate)} dus (retards et partiels)</span></button>
        <button class="tile ${d.partiel ? 'crit' : ''}" data-go="payeurs" data-status="partiel"><span class="t">Paiements partiels</span><span class="s">Solde à compléter</span><span class="kpi"><span class="v num">${d.partiel}</span><span class="u">${v.contracts.toLowerCase()}</span></span><span class="ft">à relancer pour le reste</span></button>
        <button class="tile ${d.toVerify ? 'crit' : 'pos'}" data-go="rapprochement"><span class="t">Rapprochement</span><span class="s">Lignes reçues à vérifier</span><span class="kpi"><span class="v num">${d.toVerify}</span><span class="u">lignes</span></span><span class="ft">${d.toVerify ? 'à associer ou ignorer' : 'tout est rapproché'}</span></button>
        <button class="tile" data-go="relances"><span class="t">Relances</span><span class="s">WhatsApp, message préparé</span><span class="kpi"><span class="v num">${d.retard + d.partiel}</span><span class="u">à envoyer</span></span><span class="ft">${d.monthReminders} déjà envoyées ce mois</span></button>
      </div></div>
      <div class="group"><h2>Applications</h2><div class="tiles">
        <button class="tile" data-go="payeurs"><span class="t">${esc(v.payers)}</span><span class="s">${esc(v.contracts)}, ${esc(v.amount.toLowerCase())}s, alias</span><span class="ico"><svg><use href="#i-users"/></svg></span></button>
        <button class="tile" data-go="echeances"><span class="t">Échéancier</span><span class="s">Toutes les échéances du mois</span><span class="ico"><svg><use href="#i-cal"/></svg></span></button>
        <button class="tile" data-go="encaissements"><span class="t">Encaissements</span><span class="s">Saisie, import, reçus, export</span><span class="ico"><svg><use href="#i-wallet"/></svg></span></button>
        <button class="tile" data-go="rapprochement"><span class="t">Rapprochement</span><span class="s">API PI-SPI et relevés</span><span class="ico"><svg><use href="#i-link"/></svg></span></button>
        <button class="tile" data-go="relances"><span class="t">Relances</span><span class="s">Messages WhatsApp</span><span class="ico"><svg><use href="#i-send"/></svg></span></button>
        <button class="tile" data-go="demande"><span class="t">Demande de paiement</span><span class="s">Alias et QR PI-SPI</span><span class="ico"><svg><use href="#i-qr"/></svg></span></button>
        <button class="tile" data-go="parametres"><span class="t">Paramètres</span><span class="s">Établissement, modèles, équipe</span><span class="ico"><svg><use href="#i-gear"/></svg></span></button>
        ${state.admin ? `<button class="tile" data-go="admin"><span class="t">Administration Jotna</span><span class="s">Établissements et abonnements</span><span class="ico"><svg><use href="#i-shield"/></svg></span></button>` : ''}
      </div></div></div>`;
    const badge = $('#notifBadge'); badge.hidden = !d.toVerify; badge.textContent = d.toVerify;
    $$('[data-go]', app).forEach((b) => b.addEventListener('click', () => { const go = b.dataset.go; if (go === 'demande') return openRequests(); if (go === 'payeurs') { state.filters = { q: '', group: '', status: b.dataset.status || '' }; } route(go); }));
    const r = $('#btnReset'); if (r) r.addEventListener('click', () => openDialog('Réinitialiser la démo', '<p>Les données fictives seront régénérées. Vos saisies de test disparaîtront.</p>', 'Réinitialiser', async () => { await api('POST', '/api/demo/reset'); toast('Démo réinitialisée.'); render(); }));
    const l = $('#btnLoadDemo'); if (l) l.addEventListener('click', async () => { try { const r2 = await api('POST', '/api/demo/load'); toast(`${r2.payers} ${V().payers.toLowerCase()} d'exemple chargés.`); render(); } catch (e) { fail(e); } });
    const od = $('#obDismiss'); if (od) od.addEventListener('click', async () => { state.tenant.onboarding = await api('POST', '/api/onboarding', { step: 'dismissed' }); render(); });
    const oi = $('#obInformed'); if (oi) oi.addEventListener('click', openInformMessage);
  }

  // ---------- Payeurs (List Report) ----------
  let payersCache = [];
  async function renderPayers(rid) {
    const v = V(); payersCache = await api('GET', `/api/payers?month=${state.month}`); if (rid && rid !== state.rid) return;
    const groups = [...new Set(payersCache.flatMap((p) => p.contracts.map((c) => c.group)).filter(Boolean))].sort();
    const canEdit = ['gestionnaire', 'direction'].includes(state.me.role);
    app.innerHTML = dpHead(v.payers, `${v.contracts} et statut de ${v.amount.toLowerCase()} · ${monthNote()}`,
      canEdit ? `<button class="btn" id="btnImport">Importer un fichier</button><button class="btn" id="btnAdd">Ajouter</button><button class="btn emph" id="btnReqLate">Demander le paiement aux retardataires</button>` : '',
      `<div class="filterbar"><div class="field"><label for="fQ">Rechercher</label><input id="fQ" type="search" placeholder="Nom, ${v.contract.toLowerCase()}, téléphone, alias, référence" value="${esc(state.filters.q)}"></div>
       <div class="field"><label for="fG">${esc(v.group)}</label><select id="fG"><option value="">Tous</option>${groups.map((g) => `<option ${g === state.filters.group ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></div>
       <div class="field"><label for="fS">Statut du mois</label><select id="fS"><option value="">Tous</option>${['paye', 'partiel', 'retard', 'avenir'].map((s) => `<option value="${s}" ${s === state.filters.status ? 'selected' : ''}>${STATUS[s]}</option>`).join('')}</select></div>
       <div class="fb-actions"><button class="btn ghost" id="fReset">Réinitialiser</button><button class="btn emph" id="fGo">Lancer</button></div></div>`)
      + `<div class="page gutter"><div class="tbl-wrap"><div class="toolbar"><h2 id="tblTitle"></h2><span class="spacer"></span><button class="btn sm" id="btnSort">Trier : retard d'abord</button></div><div class="scroll"><table><thead><tr><th style="width:2rem"><input type="checkbox" id="chkAll" aria-label="Tout sélectionner"></th><th>${esc(v.payer)}</th><th>${esc(v.contract)} · ${esc(v.group.toLowerCase())}</th><th class="r">${esc(v.amount)}</th><th>Statut</th><th>Dernier paiement</th><th>Relances</th><th style="width:2rem"></th></tr></thead><tbody id="tb"></tbody></table></div></div></div>
      <div class="footerbar" id="footerbar" hidden><span class="count" id="selCount"></span><button class="btn" id="btnRemindSel">Relancer</button><button class="btn emph" id="btnReqSel">Demander le paiement</button></div>`;
    let sortLate = true;
    const filtered = () => { const f = state.filters; const order = { retard: 0, partiel: 1, avenir: 2, paye: 3, aucun: 4 };
      let rows = payersCache.filter((p) => (!f.q || `${p.nom} ${p.tel} ${p.alias} ${p.contracts.map((c) => c.label + ' ' + c.ref).join(' ')}`.toLowerCase().includes(f.q.toLowerCase())) && (!f.group || p.contracts.some((c) => c.group === f.group)) && (!f.status || p.status === f.status));
      return sortLate ? rows.sort((a, b) => order[a.status] - order[b.status] || a.nom.localeCompare(b.nom)) : rows.sort((a, b) => a.nom.localeCompare(b.nom)); };
    const draw = () => { const rows = filtered(); $('#tblTitle').textContent = `${v.payers} (${rows.length})`;
      $('#tb').innerHTML = rows.length ? rows.map((p) => `<tr class="link ${state.selected.has(p.id) ? 'sel' : ''}" data-id="${p.id}"><td><input type="checkbox" data-sel="${p.id}" ${state.selected.has(p.id) ? 'checked' : ''} aria-label="Sélectionner ${esc(p.nom)}"></td>
        <td><div class="main">${esc(p.nom)}</div><div class="sub">${esc(p.tel || '—')}${p.alias ? ' · alias ' + esc(p.alias) : ''}</div></td>
        <td>${p.contracts.filter((c) => c.active).map((c) => `<div>${esc(c.label)}</div><div class="sub">${esc(c.group || '')} · ${esc(c.ref)}</div>`).join('') || '<span class="sub">Aucun</span>'}</td>
        <td class="r num">${p.contracts.filter((c) => c.active).map((c) => fmt(c.amount)).join('<br>')}</td>
        <td>${st(p.status, p.status === 'partiel' || p.status === 'retard' ? `<div class="sub num">reste ${fmt(p.due)}</div>` : '')}</td>
        <td class="num">${p.lastPayment ? fdate(p.lastPayment.date) + '<div class="sub">' + fmt(p.lastPayment.amount) + ' · ' + esc(p.lastPayment.channel) + '</div>' : '<span class="sub">Aucun</span>'}</td>
        <td>${p.reminders ? `<span class="pill info">${p.reminders} ce mois</span>` : ''}</td><td class="chev"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><use href="#i-chev"/></svg></td></tr>`).join('') : `<tr><td colspan="8" class="empty">Aucun ${v.payer.toLowerCase()} ne correspond.</td></tr>`;
      $('#chkAll').checked = rows.length > 0 && rows.every((p) => state.selected.has(p.id)); footer(); };
    const footer = () => { const n = state.selected.size; $('#footerbar').hidden = !n; $('#selCount').textContent = n === 1 ? '1 sélectionné' : `${n} sélectionnés`; };
    const read = () => { state.filters = { q: val('fQ'), group: val('fG'), status: val('fS') }; draw(); };
    $('#fGo').addEventListener('click', read); $('#fQ').addEventListener('keydown', (e) => e.key === 'Enter' && read()); $('#fG').addEventListener('change', read); $('#fS').addEventListener('change', read);
    $('#fReset').addEventListener('click', () => { state.filters = { q: '', group: '', status: '' }; $('#fQ').value = ''; $('#fG').value = ''; $('#fS').value = ''; draw(); });
    $('#btnSort').addEventListener('click', (e) => { sortLate = !sortLate; e.currentTarget.textContent = sortLate ? 'Trier : alphabétique' : 'Trier : retard d\'abord'; draw(); });
    $('#tb').addEventListener('click', (e) => { const cb = e.target.closest('[data-sel]'); if (cb) { cb.checked ? state.selected.add(cb.dataset.sel) : state.selected.delete(cb.dataset.sel); cb.closest('tr').classList.toggle('sel', cb.checked); footer(); return; } const tr = e.target.closest('tr[data-id]'); if (tr) { state.payerId = tr.dataset.id; route('payeur'); } });
    $('#chkAll').addEventListener('change', (e) => { filtered().forEach((p) => (e.target.checked ? state.selected.add(p.id) : state.selected.delete(p.id))); draw(); });
    const selContracts = () => payersCache.filter((p) => state.selected.has(p.id)).flatMap((p) => p.contracts.filter((c) => c.active && c.installment.status !== 'paye').map((c) => c.id));
    $('#btnRemindSel').addEventListener('click', () => sendReminders(selContracts()));
    $('#btnReqSel').addEventListener('click', () => openRequests(selContracts()));
    if (canEdit) {
      $('#btnReqLate').addEventListener('click', () => openRequests(payersCache.flatMap((p) => p.contracts.filter((c) => c.active && (c.installment.status === 'retard' || c.installment.status === 'partiel')).map((c) => c.id))));
      $('#btnAdd').addEventListener('click', () => openDialog(`Ajouter un ${v.payer.toLowerCase()}`, `${field('nNom', `Nom du ${v.payer.toLowerCase()}`, 'text', '', 'required')}${field('nTel', 'Téléphone (WhatsApp)', 'tel', '', 'placeholder="77 000 00 00"')}${field('nAlias', 'Alias PI-SPI (facultatif, distinct du téléphone)', 'text', '', 'placeholder="prenom.nom"')}<hr style="border:0;border-top:1px solid var(--border)">${field('nLabel', v.contract, 'text', '', `placeholder="${v.contract === 'Élève' ? 'Prénom Nom de l\'élève' : v.contract === 'Logement' ? 'Appt B3' : 'Libellé'}"`)}${field('nGroup', v.group, 'text', '', '')}${field('nAmount', `${v.amount} (FCFA)`, 'number', '', 'min="0" step="500"')}${field('nStart', 'Première échéance', 'month', state.month)}`, 'Enregistrer', async () => {
        if (!val('nNom')) { toast('Le nom est obligatoire.'); return false; }
        await api('POST', '/api/payers', { nom: val('nNom'), tel: val('nTel'), alias: val('nAlias'), contract: val('nLabel') ? { label: val('nLabel'), group: val('nGroup'), amount: Number(val('nAmount')), startMonth: val('nStart') } : null }); toast(`${val('nNom')} ajouté.`); renderPayers(); }));
      $('#btnImport').addEventListener('click', () => openDialog(`Importer des ${v.payers.toLowerCase()}`, `<div class="muted" style="font-size:.8125rem">Fichier CSV (séparateur ; ou ,) avec une ligne d'en-tête. Colonnes reconnues : <b>nom</b> (ou parent, locataire, adherent), <b>telephone</b>, <b>alias</b>, <b>${v.contract.toLowerCase()}</b> (eleve, logement, abonnement), <b>${v.group.toLowerCase()}</b> (classe, immeuble, formule), <b>montant</b> (mensualite, loyer, cotisation), <b>debut</b> (AAAA-MM).</div><div class="field"><label for="impFile">Fichier</label><input id="impFile" type="file" accept=".csv,text/csv,.txt"></div><div class="field"><label for="impText">Ou collez le contenu</label><textarea id="impText" rows="6" placeholder="nom;telephone;alias;eleve;classe;montant&#10;Aminata Diallo;77 123 45 67;aminata.diallo;Alioune Diallo;CM2;55000"></textarea></div>`, 'Importer', async () => {
        let text = $('#impText').value; const f = $('#impFile').files[0]; if (f) text = await f.text(); if (!text.trim()) { toast('Choisissez un fichier ou collez le contenu.'); return false; }
        const r = await api('POST', '/api/payers/import', { csv: text }); toast(`${r.rows} lignes lues : ${r.created} créés, ${r.merged} déjà connus.`, true); renderPayers(); }));
    }
    draw();
  }

  // ---------- Fiche payeur (Object Page) ----------
  async function renderPayer(rid) {
    if (!state.payerId) return route('payeurs');
    const v = V(); const p = await api('GET', `/api/payers/${state.payerId}?month=${state.month}`); if (rid && rid !== state.rid) return;
    const active = p.contracts.filter((c) => c.active); const due = active.reduce((a, c) => a + Math.max(0, c.installment.amount - c.installment.paid), 0);
    const worst = active.some((c) => c.installment.status === 'retard') ? 'retard' : active.some((c) => c.installment.status === 'partiel') ? 'partiel' : active.length && active.every((c) => c.installment.status === 'paye') ? 'paye' : active.length ? 'avenir' : 'aucun';
    const canEdit = ['gestionnaire', 'direction'].includes(state.me.role); const canPay = ['gestionnaire', 'comptable'].includes(state.me.role);
    app.innerHTML = `<div class="op-head"><div class="inner gutter"><div class="bc"><a href="#accueil">Accueil</a> › <a href="#payeurs">${esc(v.payers)}</a> › ${esc(p.nom)}</div>
      <div class="op-title"><div class="av">${initials(p.nom)}</div><div><h1>${esc(p.nom)}</h1><div class="muted">${active.map((c) => `${esc(c.label)}${c.group ? ' · ' + esc(c.group) : ''}`).join(' · ') || 'Aucun ' + v.contract.toLowerCase() + ' actif'}</div></div>
      <div class="actions">${canEdit ? `<button class="btn" id="opEdit">Modifier</button><button class="btn" id="opRemind"><svg><use href="#i-send"/></svg>Relancer</button>` : ''}<button class="btn" id="opRequest"><svg><use href="#i-qr"/></svg>Demander le paiement</button>${canPay ? `<button class="btn emph" id="opPaid" ${!due ? 'disabled' : ''}><svg><use href="#i-check"/></svg>Enregistrer un paiement</button>` : ''}</div></div>
      <div class="facets">
        <div class="facet"><div class="l">${esc(v.amount)}${active.length > 1 ? 's' : ''}</div><div class="v num">${active.map((c) => fmt(c.amount)).join(' + ') || '—'}</div></div>
        <div class="facet"><div class="l">Statut ${esc(monthLabel(state.month))}</div><div class="v">${st(worst)}</div></div>
        <div class="facet"><div class="l">Solde dû</div><div class="v big num" style="color:${due ? 'var(--negative)' : 'var(--positive)'}">${fmt(due)}</div></div>
        <div class="facet"><div class="l">Téléphone (WhatsApp)</div><div class="v num">${esc(p.tel || '—')}</div></div>
        <div class="facet"><div class="l">Alias PI-SPI</div><div class="v">${p.alias ? esc(p.alias) : `<span class="muted" style="font-weight:400">Non renseigné</span>${canEdit ? ' <button class="btn sm" id="opAlias">Renseigner</button>' : ''}`}</div></div>
        <div class="facet"><div class="l">Retards sur 6 mois</div><div class="v">${p.history.filter((h) => h.status === 'retard' || (h.paidOn && h.paidOn > h.due)).length}</div></div>
      </div></div></div>
      <nav class="anchorbar gutter"><div class="inner"><button class="on" data-anchor="sEch">Échéances</button><button data-anchor="sPay">Paiements</button><button data-anchor="sRel">Relances</button><button data-anchor="sInfo">Coordonnées</button></div></nav>
      <div class="page gutter">
        <div class="section" id="sEch"><h2>Échéances des six derniers mois</h2><div class="tbl-wrap"><div class="scroll"><table><thead><tr><th>Mois</th><th>${esc(v.contract)}</th><th>Échéance</th><th class="r">Attendu</th><th class="r">Reçu</th><th>Payé le</th><th>Statut</th></tr></thead><tbody>${p.history.map((h) => `<tr><td>${esc(h.monthLabel)}</td><td>${esc(h.label)}</td><td class="num">${fdate(h.due)}</td><td class="r num">${fmt(h.amount)}</td><td class="r num">${h.paid ? fmt(h.paid) : '—'}</td><td class="num">${fdate(h.paidOn)}</td><td>${st(h.status, h.paidOn && h.paidOn > h.due ? '<span class="sub"> · après l\'échéance</span>' : '')}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Aucune échéance.</td></tr>'}</tbody></table></div></div></div>
        <div class="section" id="sPay"><h2>Paiements reçus</h2><div class="tbl-wrap"><div class="scroll"><table><thead><tr><th>Date</th><th class="r">Montant</th><th>Canal</th><th>Référence</th><th>Mois</th><th>Rapprochement</th><th>Reçu</th></tr></thead><tbody>${p.payments.map((x) => `<tr><td class="num">${fdate(x.date)}</td><td class="r num">${fmt(x.amount)}</td><td>${esc(x.channel)}</td><td class="num">${esc(x.ref)}</td><td>${esc(monthLabel(x.month))}</td><td><span class="pill ${x.source === 'manuel' ? 'info' : 'pos'}">${x.source === 'manuel' ? 'Saisie manuelle' : x.motif.startsWith('Associé manuellement') ? 'Associé à la main' : 'Automatique'}</span></td><td><a class="btn sm" href="/api/receipts/${x.id}" target="_blank" rel="noopener">Reçu</a></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Aucun paiement enregistré.</td></tr>'}</tbody></table></div></div></div>
        <div class="section" id="sRel"><h2>Relances envoyées</h2><div class="panel timeline">${p.reminders.map((r) => `<div class="tl-item"><span class="pt"></span><div><div class="d">${fdate(r.date)} · ${esc(r.channel)} · ${esc(r.by)}</div><div class="m">${esc(r.message)}</div></div></div>`).join('') || '<div class="empty">Aucune relance envoyée.</div>'}</div></div>
        <div class="section" id="sInfo"><h2>Coordonnées et contrats</h2><div class="panel"><div class="kv"><div><div class="l">Téléphone (WhatsApp)</div><div class="v num">${esc(p.tel || '—')}</div></div><div><div class="l">Alias PI-SPI du payeur</div><div class="v">${esc(p.alias || '—')}</div></div><div><div class="l">E-mail</div><div class="v">${esc(p.email || '—')}</div></div><div><div class="l">Note</div><div class="v">${esc(p.note || '—')}</div></div><div><div class="l">Alias PI-SPI de l'établissement</div><div class="v">${esc(state.tenant.alias)}</div></div></div>
          <table style="min-width:0;margin-top:1rem"><thead><tr><th>Réf.</th><th>${esc(v.contract)}</th><th>${esc(v.group)}</th><th class="r">${esc(v.amount)}</th><th>Depuis</th><th>Statut</th>${canEdit ? '<th></th>' : ''}</tr></thead><tbody>${p.contracts.map((c) => `<tr><td class="num">${esc(c.ref)}</td><td>${esc(c.label)}</td><td>${esc(c.group || '—')}</td><td class="r num">${fmt(c.amount)}</td><td>${esc(monthLabel(c.startMonth))}</td><td>${c.active ? '<span class="pill pos">Actif</span>' : '<span class="pill neutral">Clos</span>'}</td>${canEdit ? `<td><button class="btn sm" data-ctr="${c.id}">Modifier</button></td>` : ''}</tr>`).join('')}</tbody></table>
          ${canEdit ? `<div style="margin-top:.75rem"><button class="btn sm" id="opAddCtr">Ajouter un ${v.contract.toLowerCase()}</button></div>` : ''}</div></div>
      </div>`;
    $$('[data-anchor]', app).forEach((b) => b.addEventListener('click', () => { $$('[data-anchor]', app).forEach((x) => x.classList.toggle('on', x === b)); const el = $('#' + b.dataset.anchor); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' }); }));
    const on = (id, fn) => { const el = $('#' + id); if (el) el.addEventListener('click', fn); };
    on('opRequest', () => openRequests(active.filter((c) => c.installment.status !== 'paye').map((c) => c.id)));
    on('opRemind', () => sendReminders(active.filter((c) => c.installment.status !== 'paye').map((c) => c.id)));
    on('opAlias', () => openDialog('Renseigner l\'alias PI-SPI', `${field('alVal', 'Alias PI-SPI du payeur', 'text', '', 'placeholder="prenom.nom"')}<div class="muted" style="font-size:.8125rem">L'alias est l'identifiant de paiement choisi par le payeur auprès de sa banque ou de son opérateur. Il est distinct du téléphone, qui sert aux relances WhatsApp. Les prochains paiements reçus de cet alias seront rapprochés automatiquement.</div>`, 'Enregistrer', async () => { if (!val('alVal')) { toast('Indiquez un alias.'); return false; } await api('PUT', `/api/payers/${p.id}`, { alias: val('alVal') }); toast('Alias enregistré.'); renderPayer(); }));
    on('opEdit', () => openDialog(`Modifier ${p.nom}`, `${field('eNom', 'Nom', 'text', p.nom)}${field('eTel', 'Téléphone (WhatsApp)', 'tel', p.tel)}${field('eAlias', 'Alias PI-SPI', 'text', p.alias)}${field('eEmail', 'E-mail', 'email', p.email)}${field('eNote', 'Note', 'text', p.note)}<div style="display:flex;justify-content:flex-start"><button class="btn sm neg" type="button" id="eDel">Supprimer ou archiver</button></div>`, 'Enregistrer', async () => { await api('PUT', `/api/payers/${p.id}`, { nom: val('eNom'), tel: val('eTel'), alias: val('eAlias'), email: val('eEmail'), note: val('eNote') }); toast('Modifications enregistrées.'); renderPayer(); }));
    document.addEventListener('click', async function del(e) { if (e.target.id !== 'eDel') return; document.removeEventListener('click', del); try { const r = await api('DELETE', `/api/payers/${p.id}`); $('#dlg').close(); toast(r.archived ? 'Contrats clos : l\'historique des paiements est conservé.' : 'Supprimé.'); route('payeurs'); } catch (er) { fail(er); } }, { once: false });
    on('opPaid', () => { const opts = active.filter((c) => c.installment.status !== 'paye').map((c) => [c.id, `${c.label} · ${c.ref} (reste ${fmt(c.installment.amount - c.installment.paid)})`]);
      openDialog('Enregistrer un paiement reçu', `${select('mpCtr', v.contract, opts)}${field('mpMonth', 'Mois', 'month', state.month)}${field('mpAmount', 'Montant reçu (FCFA)', 'number', active.find((c) => c.id === opts[0]?.[0]) ? active.find((c) => c.id === opts[0][0]).installment.amount - active.find((c) => c.id === opts[0][0]).installment.paid : '', 'min="1" step="500"')}${select('mpChan', 'Canal', [['Espèces', 'Espèces'], ['Wave', 'Wave'], ['Orange Money', 'Orange Money'], ['Virement', 'Virement'], ['Alias PI-SPI', 'Alias PI-SPI'], ['Chèque', 'Chèque']])}${field('mpDate', 'Date', 'date', new Date().toISOString().slice(0, 10))}${field('mpRef', 'Référence (facultatif)', 'text', '', 'placeholder="N° de reçu ou de transaction"')}`, 'Enregistrer', async () => { const amount = Number(val('mpAmount')); if (!amount) { toast('Indiquez un montant.'); return false; } const r = await api('POST', '/api/payments', { contractId: val('mpCtr'), month: val('mpMonth'), amount, channel: val('mpChan'), date: val('mpDate'), ref: val('mpRef') }); toast(`${fmt(amount)} enregistrés. Reçu ${r.ref} disponible.`); renderPayer(); }); });
    on('opAddCtr', () => openDialog(`Ajouter un ${v.contract.toLowerCase()}`, `${field('cLabel', v.contract, 'text', '', 'required')}${field('cGroup', v.group)}${field('cAmount', `${v.amount} (FCFA)`, 'number', '', 'min="1" step="500"')}${field('cStart', 'Première échéance', 'month', state.month)}`, 'Ajouter', async () => { await api('POST', '/api/contracts', { payerId: p.id, label: val('cLabel'), group: val('cGroup'), amount: Number(val('cAmount')), startMonth: val('cStart') }); toast('Ajouté.'); renderPayer(); }));
    $$('[data-ctr]', app).forEach((b) => b.addEventListener('click', () => { const c = p.contracts.find((x) => x.id === b.dataset.ctr); openDialog(`Modifier ${c.ref}`, `${field('cLabel', v.contract, 'text', c.label)}${field('cGroup', v.group, 'text', c.group)}${field('cAmount', `${v.amount} (FCFA)`, 'number', c.amount, 'min="1" step="500"')}${select('cActive', 'Statut', [['1', 'Actif'], ['0', 'Clos (ne génère plus d\'échéances)']], c.active ? '1' : '0')}`, 'Enregistrer', async () => { await api('PUT', `/api/contracts/${c.id}`, { label: val('cLabel'), group: val('cGroup'), amount: Number(val('cAmount')), active: val('cActive') === '1' }); toast('Contrat mis à jour.'); renderPayer(); }); }));
  }

  // ---------- Échéancier ----------
  async function renderInstallments(rid) {
    const v = V(); const list = await api('GET', `/api/installments?month=${state.month}`); if (rid && rid !== state.rid) return;
    const order = { retard: 0, partiel: 1, avenir: 2, paye: 3 }; list.sort((a, b) => order[a.status] - order[b.status] || (a.payer?.nom || '').localeCompare(b.payer?.nom || ''));
    const tot = (f) => list.filter(f).reduce((a, i) => a + i.amount, 0);
    app.innerHTML = dpHead('Échéancier', monthNote()) + `<div class="page gutter"><div class="kpis">
      <div class="kcard"><div class="l">Attendu</div><div class="v num">${fmt(tot(() => true))}</div></div><div class="kcard pos"><div class="l">Payé</div><div class="v num">${fmt(list.reduce((a, i) => a + Math.min(i.paid, i.amount), 0))}</div></div><div class="kcard neg"><div class="l">En retard</div><div class="v num">${fmt(tot((i) => i.status === 'retard'))}</div></div><div class="kcard crit"><div class="l">Reste sur partiels</div><div class="v num">${fmt(list.filter((i) => i.status === 'partiel').reduce((a, i) => a + i.amount - i.paid, 0))}</div></div></div>
      <div class="tbl-wrap"><div class="toolbar"><h2>Échéances (${list.length})</h2></div><div class="scroll"><table><thead><tr><th>${esc(v.payer)}</th><th>${esc(v.contract)}</th><th>${esc(v.group)}</th><th>Réf.</th><th>Échéance</th><th class="r">Attendu</th><th class="r">Reçu</th><th>Statut</th></tr></thead><tbody>${list.map((i) => `<tr class="link" data-id="${i.payerId}"><td class="main">${esc(i.payer?.nom || '—')}</td><td>${esc(i.label)}</td><td>${esc(i.group || '—')}</td><td class="num">${esc(i.ref)}</td><td class="num">${fdate(i.due)}</td><td class="r num">${fmt(i.amount)}</td><td class="r num">${i.paid ? fmt(i.paid) : '—'}</td><td>${st(i.status, i.daysLate ? `<span class="sub"> · ${i.daysLate} j</span>` : '')}</td></tr>`).join('') || `<tr><td colspan="8" class="empty">Aucune échéance ce mois. Ajoutez des ${v.contracts.toLowerCase()} ou changez de mois.</td></tr>`}</tbody></table></div></div></div>`;
    $$('tr[data-id]', app).forEach((tr) => tr.addEventListener('click', () => { state.payerId = tr.dataset.id; route('payeur'); }));
  }

  // ---------- Encaissements ----------
  async function renderPayments(rid) {
    const v = V(); const all = await api('GET', '/api/payments'); if (rid && rid !== state.rid) return; const canPay = ['gestionnaire', 'comptable'].includes(state.me.role);
    const tabs = [['tous', 'Tous'], ['associe', 'Associés'], ['a_verifier', 'À vérifier'], ['ignore', 'Ignorés']];
    const rows = all.filter((p) => state.encTab === 'tous' || p.status === state.encTab).sort((a, b) => b.date.localeCompare(a.date));
    app.innerHTML = dpHead('Encaissements', `${all.length} lignes reçues · ${fmt(all.filter((p) => p.status === 'associe').reduce((a, p) => a + p.amount, 0))} associés au total`,
      `<a class="btn" href="/api/export/payments.csv" download>Exporter (CSV)</a>${canPay ? `<button class="btn" id="btnImportPay">Importer un relevé</button><button class="btn emph" id="btnManual">Saisir un paiement</button>` : ''}`)
      + `<div class="page gutter"><div class="tabs">${tabs.map(([k, l]) => `<button class="${state.encTab === k ? 'on' : ''}" data-tab="${k}">${l} (${k === 'tous' ? all.length : all.filter((p) => p.status === k).length})</button>`).join('')}</div>
      <div class="tbl-wrap"><div class="scroll"><table><thead><tr><th>Date</th><th>Émetteur</th><th>Libellé</th><th class="r">Montant</th><th>Canal</th><th>Référence</th><th>Affectation</th><th>Source</th><th></th></tr></thead><tbody>${rows.map((p) => `<tr><td class="num">${fdate(p.date)}</td><td>${esc(p.sender || '—')}</td><td class="sub">${esc(p.label || '—')}</td><td class="r num">${fmt(p.amount)}</td><td>${esc(p.channel)}</td><td class="num">${esc(p.ref)}</td><td>${p.status === 'associe' ? `<div>${esc(p.contract?.payer || '')}</div><div class="sub">${esc(p.contract?.label || '')} · ${esc(monthLabel(p.month))}</div>` : p.status === 'a_verifier' ? `<span class="pill crit">À vérifier</span><div class="sub">${esc(p.motif)}</div>` : `<span class="pill neutral">Ignoré</span>`}</td><td><span class="pill ${p.source === 'api' ? 'info' : 'neutral'}">${p.source === 'api' ? 'API PI-SPI' : p.source === 'import' ? 'Relevé' : 'Manuel'}</span></td><td>${p.status === 'associe' ? `<a class="btn sm" href="/api/receipts/${p.id}" target="_blank" rel="noopener">Reçu</a>` : p.status === 'a_verifier' ? `<a class="btn sm" href="#rapprochement">Traiter</a>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">Aucune ligne.</td></tr>'}</tbody></table></div></div></div>`;
    $$('[data-tab]', app).forEach((b) => b.addEventListener('click', () => { state.encTab = b.dataset.tab; renderPayments(); }));
    if (canPay) {
      $('#btnImportPay').addEventListener('click', () => openDialog('Importer un relevé', `<div class="muted" style="font-size:.8125rem">CSV exporté de Wave Business, Orange Money ou de votre banque. Colonnes reconnues : <b>date</b>, <b>montant</b>, <b>emetteur</b> (alias, numéro ou nom), <b>libelle</b>, <b>reference</b>. Chaque ligne est rapprochée automatiquement : référence du ${v.contract.toLowerCase()} dans le libellé, puis alias, puis numéro de téléphone. Les doublons (même référence) sont ignorés.</div>${select('impChan', 'Canal du relevé', [['Wave', 'Wave'], ['Orange Money', 'Orange Money'], ['Virement', 'Banque (virements)'], ['Alias PI-SPI', 'PI-SPI'], ['Relevé', 'Autre']])}<div class="field"><label for="impFile">Fichier</label><input id="impFile" type="file" accept=".csv,text/csv,.txt"></div><div class="field"><label for="impText">Ou collez le contenu</label><textarea id="impText" rows="5" placeholder="date;montant;emetteur;libelle;reference&#10;2026-11-05;55000;aminata.diallo;KX-0001 2026-11;PI11000123"></textarea></div>`, 'Importer et rapprocher', async () => {
        let text = $('#impText').value; const f = $('#impFile').files[0]; if (f) text = await f.text(); if (!text.trim()) { toast('Choisissez un fichier ou collez le contenu.'); return false; }
        const r = await api('POST', '/api/payments/import', { csv: text, channel: val('impChan') }); toast(`${r.lines} lignes : ${r.auto} associées automatiquement, ${r.toVerify} à vérifier, ${r.duplicates} doublons.`, true); state.encTab = r.toVerify ? 'a_verifier' : 'associe'; renderPayments(); }));
      $('#btnManual').addEventListener('click', async () => { const payers = await api('GET', `/api/payers?month=${state.month}`); const opts = payers.flatMap((p) => p.contracts.filter((c) => c.active).map((c) => [c.id, `${p.nom} · ${c.label} (${c.ref})`]));
        openDialog('Saisir un paiement reçu', `${select('mpCtr', v.contract, opts)}${field('mpMonth', 'Mois', 'month', state.month)}${field('mpAmount', 'Montant (FCFA)', 'number', '', 'min="1" step="500"')}${select('mpChan', 'Canal', [['Espèces', 'Espèces'], ['Wave', 'Wave'], ['Orange Money', 'Orange Money'], ['Virement', 'Virement'], ['Alias PI-SPI', 'Alias PI-SPI'], ['Chèque', 'Chèque']])}${field('mpDate', 'Date', 'date', new Date().toISOString().slice(0, 10))}${field('mpRef', 'Référence (facultatif)')}`, 'Enregistrer', async () => { const amount = Number(val('mpAmount')); if (!amount || !val('mpCtr')) { toast('Choisissez le contrat et le montant.'); return false; } await api('POST', '/api/payments', { contractId: val('mpCtr'), month: val('mpMonth'), amount, channel: val('mpChan'), date: val('mpDate'), ref: val('mpRef') }); toast('Paiement enregistré.'); renderPayments(); }); });
    }
  }

  // ---------- Rapprochement ----------
  async function renderReconcile(rid) {
    const v = V(); const [pending, payers] = await Promise.all([api('GET', '/api/payments?status=a_verifier'), api('GET', `/api/payers?month=${state.month}`)]);
    const all = await api('GET', '/api/payments'); if (rid && rid !== state.rid) return; const auto = all.filter((p) => p.status === 'associe' && p.source !== 'manuel' && !p.motif.startsWith('Associé manuellement')).length;
    const canPay = ['gestionnaire', 'comptable'].includes(state.me.role);
    const opts = payers.flatMap((p) => p.contracts.filter((c) => c.active).map((c) => ({ id: c.id, label: `${p.nom} · ${c.label} (${c.ref}, reste ${fmt(Math.max(0, c.installment.amount - c.installment.paid))})`, unpaid: c.installment.status !== 'paye' }))).sort((a, b) => Number(b.unpaid) - Number(a.unpaid) || a.label.localeCompare(b.label));
    app.innerHTML = dpHead('Rapprochement des encaissements', `Chaque ligne reçue est associée à un ${v.contract.toLowerCase()} ; l'échéance passe alors à « Payé ». Les lignes dont la référence, l'alias ou le numéro sont reconnus sont associées sans intervention.`)
      + `<div class="page gutter"><div class="kpis"><div class="kcard"><div class="l">Lignes reçues</div><div class="v num">${all.length}</div></div><div class="kcard pos"><div class="l">Associées automatiquement</div><div class="v num">${auto}</div></div><div class="kcard ${pending.length ? 'crit' : 'pos'}"><div class="l">À vérifier</div><div class="v num">${pending.length}</div></div><div class="kcard"><div class="l">Montant en attente</div><div class="v num">${fmt(pending.reduce((a, p) => a + p.amount, 0))}</div></div></div>
      <div class="tbl-wrap"><div class="toolbar"><h2>Lignes à vérifier (${pending.length})</h2><span class="spacer"></span><a class="btn sm" href="#encaissements">Toutes les lignes</a></div><div class="scroll"><table><thead><tr><th>Reçu le</th><th>Émetteur</th><th>Libellé</th><th class="r">Montant</th><th>Canal</th><th>Motif de vérification</th><th>Associer à</th><th>Mois</th><th></th></tr></thead><tbody>${pending.map((p) => `<tr><td class="num">${fdate(p.date)}</td><td>${esc(p.sender || '—')}<div class="sub">${esc(p.ref)}</div></td><td class="sub">${esc(p.label || '—')}</td><td class="r num">${fmt(p.amount)}</td><td>${esc(p.channel)}</td><td>${esc(p.motif)}</td>
        <td>${canPay ? `<select class="rowsel" data-sel="${p.id}" aria-label="Contrat"><option value="">— Choisir —</option>${opts.map((o) => `<option value="${o.id}" ${o.id === p.suggestedContractId ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>` : esc(p.suggested ? `${p.suggested.payer} · ${p.suggested.label}` : '—')}</td>
        <td>${canPay ? `<input type="month" class="rowsel" data-month="${p.id}" value="${state.month}" style="max-width:9.5rem">` : ''}</td>
        <td>${canPay ? `<div style="display:flex;gap:.25rem"><button class="btn sm emph" data-assoc="${p.id}">Associer</button><button class="btn sm ghost" data-ignore="${p.id}">Ignorer</button></div>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">Tout est rapproché. Rien à vérifier.</td></tr>'}</tbody></table></div></div>
      <div class="upload"><div><div class="t">Sources de lignes</div><div class="s">API Business PI-SPI de votre banque (en cours de raccordement, selon la banque) · Webhooks Wave Business · Import de relevés CSV depuis l'écran Encaissements · Saisie manuelle des espèces.</div></div><a class="btn" href="#encaissements">Importer un relevé</a></div></div>`;
    app.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-assoc]'); const ig = e.target.closest('[data-ignore]');
      try {
        if (a) { const id = a.dataset.assoc; const cid = $(`[data-sel="${id}"]`).value; if (!cid) return toast('Choisissez le contrat à associer.'); const line = pending.find((p) => p.id === id); const o = opts.find((x) => x.id === cid); const c = payers.flatMap((p) => p.contracts).find((x) => x.id === cid); const rest = Math.max(0, c.installment.amount - c.installment.paid);
          const doIt = async (split) => { const r = await api('POST', `/api/payments/${id}/assign`, { contractId: cid, month: $(`[data-month="${id}"]`).value, splitAmount: split }); toast(`${fmt(split || line.amount)} associés. Statut : ${STATUS[r.installment.status]}.`); renderReconcile(); };
          if (line.amount > rest && rest > 0) openDialog('Montant supérieur au reste dû', `<p>La ligne fait ${fmt(line.amount)} ; il reste ${fmt(rest)} sur ${esc(o.label)}.</p><p>Affecter ${fmt(rest)} à ce contrat et garder ${fmt(line.amount - rest)} en file de vérification (fratrie, mois suivant) ?</p>`, 'Répartir', () => doIt(rest), 'Tout affecter'); else await doIt(0);
          $('#dlgCancel').onclick = line.amount > rest && rest > 0 ? () => { $('#dlg').close(); doIt(0); } : null; }
        if (ig) { await api('POST', `/api/payments/${ig.dataset.ignore}/ignore`); toast('Ligne ignorée. Elle reste visible dans Encaissements.'); renderReconcile(); }
      } catch (er) { fail(er); }
    }, { once: true });
  }

  // ---------- Relances ----------
  async function renderReminders(rid) {
    const v = V(); const list = await api('GET', `/api/reminders?month=${state.month}`); if (rid && rid !== state.rid) return; const canSend = ['gestionnaire', 'direction'].includes(state.me.role);
    app.innerHTML = dpHead('Relances WhatsApp', `Un message par ${v.payer.toLowerCase()} en retard ou en paiement partiel, avec l'alias PI-SPI et le montant dû · ${monthNote()}`, canSend ? `<a class="btn" href="#parametres">Modèle de message</a><button class="btn emph" id="btnSendAll" ${!list.length ? 'disabled' : ''}>Marquer toutes comme envoyées</button>` : '')
      + `<div class="page gutter"><div class="strip"><span class="dot"></span><span>« Ouvrir WhatsApp » prépare le message dans votre WhatsApp (web ou téléphone) ; vous appuyez sur Envoyer. Jotna enregistre la relance dans l'historique du ${v.payer.toLowerCase()}. L'envoi automatique par l'API WhatsApp Business arrive avec l'abonnement.</span></div>
      <div class="cards">${list.map((r) => `<div class="card ${r.sent ? 'sent' : ''}"><div class="hd"><span class="av">${initials(r.payer.nom)}</span><div><div class="n">${esc(r.payer.nom)}</div><div class="s">${esc(r.label)}${r.group ? ' · ' + esc(r.group) : ''} · ${esc(r.payer.tel || 'sans téléphone')}</div></div><span class="pill ${r.status === 'partiel' ? 'crit' : 'neg'} late">${r.status === 'partiel' ? 'reste ' + fmt(r.amount - r.paid) : r.daysLate + ' j de retard'}</span></div>
        <textarea id="msg-${r.contractId}" aria-label="Message">${esc(r.message)}</textarea>
        <div class="ft">${r.sent ? `<span class="muted" style="margin-right:auto;font-size:.8125rem">${r.sent} relance${r.sent > 1 ? 's' : ''} déjà envoyée${r.sent > 1 ? 's' : ''}</span>` : ''}<button class="btn sm" data-copy="${r.contractId}"><svg><use href="#i-copy"/></svg>Copier</button>${canSend ? `<a class="btn sm emph" data-wa="${r.contractId}" href="${esc(r.waLink || '#')}" target="_blank" rel="noopener" ${r.waLink ? '' : 'aria-disabled="true"'}><svg><use href="#i-send"/></svg>Ouvrir WhatsApp</a>` : ''}</div></div>`).join('') || `<div class="empty" style="grid-column:1/-1">Toutes les échéances de ${esc(monthLabel(state.month))} sont payées.</div>`}</div></div>`;
    app.addEventListener('click', async (e) => {
      const c = e.target.closest('[data-copy]'); const w = e.target.closest('[data-wa]');
      if (c) copy($('#msg-' + c.dataset.copy).value);
      if (w) { const id = w.dataset.wa; const msg = $('#msg-' + id).value; w.href = w.href.split('?text=')[0] + '?text=' + encodeURIComponent(msg); try { await api('POST', '/api/reminders', { month: state.month, items: [{ contractId: id, message: msg }] }); w.closest('.card').classList.add('sent'); toast('Relance enregistrée dans l\'historique.'); } catch (er) { fail(er); } }
    });
    const all = $('#btnSendAll'); if (all) all.addEventListener('click', () => openDialog('Marquer toutes les relances comme envoyées', `<p>${list.length} relances seront enregistrées dans l'historique avec le texte affiché. Utilisez cette option après avoir envoyé les messages depuis votre téléphone ou votre outil de diffusion.</p>`, 'Enregistrer', async () => { await api('POST', '/api/reminders', { month: state.month, items: list.map((r) => ({ contractId: r.contractId, message: $('#msg-' + r.contractId).value })) }); toast(`${list.length} relances enregistrées.`); renderReminders(); }));
  }
  async function sendReminders(contractIds) {
    if (!contractIds.length) return toast('Aucune échéance impayée dans la sélection.');
    const r = await api('POST', '/api/reminders', { month: state.month, items: contractIds.map((id) => ({ contractId: id })) });
    openDialog(`${r.length} relance${r.length > 1 ? 's' : ''} préparée${r.length > 1 ? 's' : ''}`, `<div class="muted" style="font-size:.8125rem">Chaque relance est enregistrée dans l'historique. Ouvrez WhatsApp pour chacune et appuyez sur Envoyer.</div>${r.map((x) => `<div class="card" style="box-shadow:none"><div class="hd"><div><div class="n">${esc(x.payer)}</div></div>${x.waLink ? `<a class="btn sm emph" style="margin-left:auto" href="${esc(x.waLink)}" target="_blank" rel="noopener">Ouvrir WhatsApp</a>` : '<span class="muted" style="margin-left:auto">Sans téléphone</span>'}</div><div class="muted" style="font-size:.8125rem">${esc(x.message)}</div></div>`).join('')}`, null, 'Fermer');
    state.selected.clear();
  }

  // ---------- Demandes de paiement ----------
  async function openRequests(contractIds) {
    if (contractIds === undefined) { const payers = await api('GET', `/api/payers?month=${state.month}`); contractIds = payers.flatMap((p) => p.contracts.filter((c) => c.active && (c.installment.status === 'retard' || c.installment.status === 'partiel')).map((c) => c.id)); }
    if (!contractIds.length) return toast('Aucune échéance impayée à demander.');
    const r = await api('POST', '/api/requests', { month: state.month, contractIds });
    const total = r.reduce((a, x) => a + x.amount, 0);
    openDialog('Demande de paiement PI-SPI', `<p>${r.length === 1 ? `<b>${esc(r[0].payer)}</b> est invité à payer <b class="num">${fmt(r[0].amount)}</b>` : `<b>${r.length} demandes</b>, soit <b class="num">${fmt(total)}</b>`} vers l'alias PI-SPI <b>${esc(state.tenant.alias)}</b>. Le payeur règle depuis n'importe quel compte raccordé ; la référence dans le libellé permet le rapprochement automatique.</p>
      ${r.map((x) => `<div class="card" style="box-shadow:none"><div class="hd"><div><div class="n">${esc(x.payer)}</div><div class="s">${esc(x.label)}</div></div><span class="num" style="margin-left:auto;font-weight:600">${fmt(x.amount)}</span></div><div class="qr" title="Contenu du QR code PI-SPI (format indicatif, à aligner sur la spécification de la banque)">${esc(x.qrText)}</div><div class="ft"><button class="btn sm" data-copyreq="${esc(x.qrText)}">Copier</button>${x.waLink ? `<a class="btn sm emph" href="${esc(x.waLink)}" target="_blank" rel="noopener">Envoyer par WhatsApp</a>` : ''}</div></div>`).join('')}
      <div class="muted" style="font-size:.8125rem">L'envoi direct de la demande dans l'application bancaire du payeur passe par l'API Business PI-SPI de votre banque. En attendant son raccordement, la demande part par WhatsApp avec l'alias et la référence.</div>`, null, 'Fermer');
    $$('[data-copyreq]').forEach((b) => b.addEventListener('click', () => copy(b.dataset.copyreq)));
    state.selected.clear();
  }

  async function openInformMessage() {
    const m = await api('GET', '/api/onboarding/message');
    openDialog('Message aux payeurs', `<div class="muted" style="font-size:.8125rem">À diffuser par WhatsApp (liste de diffusion ou groupe), SMS ou affichage. Chaque payeur retrouve sa référence sur ses reçus et dans les relances.</div><div class="field"><label for="imMsg">Message</label><textarea id="imMsg" rows="7">${esc(m.message)}</textarea></div>`, 'Marquer comme envoyé', async () => { state.tenant.onboarding = await api('POST', '/api/onboarding', { step: 'informed' }); toast('Étape validée.'); if (state.view === 'accueil') render(); }, 'Fermer');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = 'Copier'; b.addEventListener('click', () => copy($('#imMsg').value)); $('#dlg .df').insertBefore(b, $('#dlgCancel'));
    $('#dlg').addEventListener('close', () => b.remove(), { once: true });
  }

  // ---------- Paramètres ----------
  async function renderSettings(rid) {
    const s = await api('GET', '/api/settings'); if (rid && rid !== state.rid) return; const t = s.tenant; const v = t.vocab; const canEdit = ['gestionnaire', 'direction'].includes(state.me.role); const isMgr = state.me.role === 'gestionnaire';
    const trialDays = Math.ceil((Date.parse(t.trialEnds) - Date.now()) / 86400000);
    app.innerHTML = dpHead('Paramètres', `${esc(t.name)} · ${TYPES[t.type]}`) + `<div class="page gutter">
      <div class="section"><h2>Établissement</h2><div class="panel"><form id="fSet" class="form-grid">${field('tName', 'Nom', 'text', t.name, canEdit ? '' : 'disabled')}${select('tType', 'Activité', Object.entries(TYPES), t.type)}${field('tCity', 'Ville', 'text', t.city, canEdit ? '' : 'disabled')}${field('tPhone', 'Téléphone de l\'établissement (WhatsApp)', 'tel', t.phone || '', canEdit ? '' : 'disabled')}${field('tAlias', 'Alias PI-SPI de l\'établissement (compte qui reçoit les paiements)', 'text', t.alias, canEdit ? '' : 'disabled')}${field('tDue', 'Jour d\'échéance mensuelle', 'number', t.dueDay, `min="1" max="28" ${canEdit ? '' : 'disabled'}`)}</form>
        <h3 style="font-size:.9375rem;margin:1.25rem 0 .5rem">Modèles de messages</h3><div class="muted" style="font-size:.8125rem;margin-bottom:.5rem">Variables : {prenom} {nom} {contrat} {groupe} {mois} {echeance} {montant} {alias} {ref} {etablissement}</div>
        <div class="field"><label for="tplRel">Relance</label><textarea id="tplRel" rows="4" ${canEdit ? '' : 'disabled'}>${esc(t.templates.relance)}</textarea></div>
        <div class="field" style="margin-top:.5rem"><label for="tplDem">Libellé de la demande de paiement</label><input id="tplDem" value="${esc(t.templates.demande)}" ${canEdit ? '' : 'disabled'}></div>
        <div class="field" style="margin-top:.5rem"><label for="tplRec">Mention sur le reçu</label><input id="tplRec" value="${esc(t.templates.recu)}" ${canEdit ? '' : 'disabled'}></div>
        ${canEdit ? `<div style="margin-top:.75rem;display:flex;gap:.5rem;justify-content:flex-end"><button class="btn" id="tplDefault">Modèles par défaut</button><button class="btn emph" id="saveSet">Enregistrer</button></div>` : ''}</div></div>
      <div class="section"><h2>Équipe</h2><div class="tbl-wrap"><div class="toolbar"><h2>${s.users.length} utilisateur${s.users.length > 1 ? 's' : ''}</h2><span class="spacer"></span>${isMgr ? '<button class="btn sm" id="addUser">Inviter</button>' : ''}</div><div class="scroll"><table style="min-width:0"><thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Depuis</th>${isMgr ? '<th></th>' : ''}</tr></thead><tbody>${s.users.map((u) => `<tr><td class="main">${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td class="num">${fdate(u.createdAt)}</td>${isMgr ? `<td>${u.id !== state.me.id ? `<button class="btn sm neg" data-deluser="${u.id}">Retirer</button>` : ''}</td>` : ''}</tr>`).join('')}</tbody></table></div></div><div class="muted" style="font-size:.8125rem;margin-top:.5rem">Gestionnaire : tout. Direction : lecture, payeurs, relances, paramètres. Comptable : lecture, encaissements, rapprochement.</div></div>
      <div class="section"><h2>Abonnement</h2><div class="panel"><div class="kv"><div><div class="l">Statut</div><div class="v"><span class="pill ${t.plan === 'actif' ? 'pos' : t.plan === 'essai' ? 'info' : 'neg'}">${t.plan === 'actif' ? 'Actif' : t.plan === 'essai' ? 'Essai gratuit' : 'Suspendu'}</span></div></div><div><div class="l">${t.plan === 'essai' ? 'Fin de l\'essai' : 'Prochaine échéance'}</div><div class="v">${fdate(t.trialEnds)}${t.plan === 'essai' ? ` (${Math.max(0, trialDays)} jours)` : ''}</div></div><div><div class="l">Tarif</div><div class="v">25 000 FCFA par mois et par établissement, jusqu'à 200 ${v.contracts.toLowerCase()} ; au-delà, sur devis</div></div><div><div class="l">Règlement</div><div class="v">Par alias PI-SPI ou Wave, sur facture mensuelle envoyée par WhatsApp. Le règlement en ligne arrive dans une prochaine version.</div></div></div></div></div>
      <div class="section"><h2>Aide</h2><div class="panel"><div class="kv"><div><div class="l">Message aux payeurs</div><div class="v"><button class="btn sm" id="btnInform">Voir le message (alias, référence, échéance)</button></div></div><div><div class="l">Support</div><div class="v">${waSupport() ? `<a class="btn sm" href="${esc(waSupport())}" target="_blank" rel="noopener">WhatsApp ${esc(state.config.supportWhatsapp)}</a>` : 'Support WhatsApp à configurer par Jotna'}${state.config.supportEmail ? ` · ${esc(state.config.supportEmail)}` : ''}</div></div><div><div class="l">Présentation</div><div class="v"><a href="/" target="_blank" rel="noopener">Page publique de Jotna</a></div></div></div></div></div>
      <div class="section"><h2>Journal</h2><div class="tbl-wrap"><div class="scroll"><table style="min-width:0"><thead><tr><th>Date</th><th>Par</th><th>Action</th><th>Détail</th></tr></thead><tbody>${s.audit.map((a) => `<tr><td class="num">${esc(a.ts.replace('T', ' ').slice(0, 16))}</td><td>${esc(a.user)}</td><td>${esc(a.action)}</td><td class="sub">${esc(a.details)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Aucune action.</td></tr>'}</tbody></table></div></div></div>
      <div class="section"><button class="btn" id="logout">Se déconnecter</button></div></div>`;
    $('#logout').addEventListener('click', async () => { await api('DELETE', '/api/auth/session'); state.me = null; state.tenant = null; route('connexion'); });
    $('#btnInform').addEventListener('click', openInformMessage);
    if (canEdit) {
      $('#saveSet').addEventListener('click', async () => { try { const tn = await api('PUT', '/api/settings', { name: val('tName'), type: val('tType'), city: val('tCity'), phone: val('tPhone'), alias: val('tAlias'), dueDay: Number(val('tDue')), templates: { relance: $('#tplRel').value, demande: val('tplDem'), recu: val('tplRec') } }); state.tenant = tn; toast('Paramètres enregistrés.'); renderSettings(); } catch (e) { fail(e); } });
      $('#tplDefault').addEventListener('click', () => { $('#tplRel').value = s.defaults.relance; $('#tplDem').value = s.defaults.demande; $('#tplRec').value = s.defaults.recu; });
    }
    if (isMgr) {
      $('#addUser').addEventListener('click', () => openDialog('Inviter un utilisateur', `${field('uName', 'Nom')}${field('uEmail', 'E-mail', 'email')}${select('uRole', 'Rôle', [['direction', 'Direction'], ['comptable', 'Comptable'], ['gestionnaire', 'Gestionnaire']], 'comptable')}${field('uPwd', 'Mot de passe provisoire (8 caractères minimum)', 'text')}<div class="muted" style="font-size:.8125rem">Transmettez-lui l'adresse et le mot de passe par un canal sûr.</div>`, 'Créer le compte', async () => { await api('POST', '/api/users', { name: val('uName'), email: val('uEmail'), role: val('uRole'), password: val('uPwd') }); toast('Compte créé.'); renderSettings(); }));
      $$('[data-deluser]', app).forEach((b) => b.addEventListener('click', () => openDialog('Retirer cet utilisateur', '<p>Il ne pourra plus se connecter. Ses actions restent dans le journal.</p>', 'Retirer', async () => { await api('DELETE', `/api/users/${b.dataset.deluser}`); toast('Utilisateur retiré.'); renderSettings(); })));
    }
  }

  // ---------- Administration Jotna ----------
  async function renderAdmin(rid) {
    const [list, adm] = await Promise.all([api('GET', '/api/admin/tenants'), api('GET', '/api/admin/settings')]); if (rid && rid !== state.rid) return;
    const mrr = list.filter((t) => t.plan === 'actif').length * 25000;
    app.innerHTML = dpHead('Administration Jotna', `${list.length} établissements · ${list.filter((t) => t.plan === 'actif').length} abonnés · ${list.filter((t) => t.plan === 'essai').length} en essai`) + `<div class="page gutter">
      <div class="kpis"><div class="kcard"><div class="l">Établissements</div><div class="v num">${list.length}</div></div><div class="kcard pos"><div class="l">Revenu mensuel récurrent</div><div class="v num">${fmt(mrr)}</div></div><div class="kcard"><div class="l">${'Contrats suivis'}</div><div class="v num">${list.reduce((a, t) => a + t.contracts, 0)}</div></div><div class="kcard"><div class="l">Attendu ce mois (tous)</div><div class="v num">${fmt(list.reduce((a, t) => a + t.expected, 0))}</div></div></div>
      <div class="panel"><h2 style="font-size:1rem;margin:0 0 .5rem">Support affiché aux établissements</h2><div class="form-grid">${field('aWa', 'Numéro WhatsApp du support (ex. 77 000 00 00)', 'tel', adm.supportWhatsapp || '')}${field('aMail', 'E-mail du support', 'email', adm.supportEmail || '')}</div><div style="margin-top:.75rem;display:flex;justify-content:flex-end"><button class="btn emph" id="aSave">Enregistrer</button></div></div>
      <div class="tbl-wrap"><div class="scroll"><table><thead><tr><th>Établissement</th><th>Activité</th><th>Créé le</th><th>Utilisateurs</th><th>Payeurs</th><th>Contrats</th><th>Taux</th><th>Plan</th><th>Jusqu'au</th><th>Dernière activité</th><th></th></tr></thead><tbody>${list.map((t) => `<tr><td class="main">${esc(t.name)}${t.demo ? ' <span class="pill neutral">démo</span>' : ''}</td><td>${TYPES[t.type]}</td><td class="num">${fdate(t.createdAt)}</td><td class="num">${t.users}</td><td class="num">${t.payers}</td><td class="num">${t.contracts}</td><td class="num">${t.rate} %</td><td><span class="pill ${t.plan === 'actif' ? 'pos' : t.plan === 'essai' ? 'info' : 'neg'}">${t.plan}</span></td><td class="num">${fdate(t.trialEnds)}</td><td class="num">${t.lastAudit ? esc(t.lastAudit.replace('T', ' ').slice(0, 16)) : '—'}</td><td><button class="btn sm" data-plan="${t.id}">Plan</button></td></tr>`).join('')}</tbody></table></div></div></div>`;
    $('#aSave').addEventListener('click', async () => { try { const r = await api('PUT', '/api/admin/settings', { supportWhatsapp: val('aWa'), supportEmail: val('aMail') }); state.config = r.effective; supportButton(); toast('Support enregistré.'); } catch (e) { fail(e); } });
    $$('[data-plan]', app).forEach((b) => b.addEventListener('click', () => { const t = list.find((x) => x.id === b.dataset.plan); openDialog(`Abonnement · ${t.name}`, `${select('pPlan', 'Plan', [['essai', 'Essai'], ['actif', 'Actif (payé)'], ['suspendu', 'Suspendu (lecture seule)']], t.plan)}${field('pEnd', 'Valable jusqu\'au', 'date', t.trialEnds)}`, 'Enregistrer', async () => { await api('PUT', `/api/admin/tenants/${t.id}`, { plan: val('pPlan'), trialEnds: val('pEnd') }); toast('Plan mis à jour.'); renderAdmin(); }); }));
  }

  // ---------- Shell ----------
  $('#btnHome').addEventListener('click', () => route('accueil'));
  $('#btnSearch').addEventListener('click', () => { route('payeurs'); setTimeout(() => { const f = $('#fQ'); if (f) f.focus(); }, 80); });
  $('#btnNotif').addEventListener('click', () => route('rapprochement'));
  $('#btnUser').addEventListener('click', () => openDialog(state.me.name, `<div class="kv"><div><div class="l">E-mail</div><div class="v">${esc(state.me.email)}</div></div><div><div class="l">Rôle</div><div class="v">${esc(state.me.role)}</div></div><div><div class="l">Établissement</div><div class="v">${esc(state.tenant.name)}</div></div></div><div style="display:flex;gap:.5rem;justify-content:flex-end"><a class="btn" href="#parametres" onclick="document.getElementById('dlg').close()">Paramètres</a><button class="btn" type="button" id="dlgLogout">Se déconnecter</button></div>`, null, 'Fermer'));
  document.addEventListener('click', async (e) => { if (e.target.id === 'dlgLogout') { await api('DELETE', '/api/auth/session'); state.me = null; $('#dlg').close(); route('connexion'); } });
  $('#monthPick').addEventListener('change', (e) => { if (/^\d{4}-\d{2}$/.test(e.target.value)) { state.month = e.target.value; render(); } });

  // ---------- Démarrage ----------
  (async () => { try { const r = await api('GET', '/api/auth/me'); setSession(r); } catch { state.me = null; try { state.config = await api('GET', '/api/public/config'); } catch { /* hors ligne */ } supportButton(); } render(); })();
})();
