/* Outil d'analyse du fichier électoral — interface en tuiles.
   Données : data/resume.json (chargé au démarrage) et data/regions/<CODE>.json (à la demande). */
(function () {
  'use strict';

  // ------------------------------------------------------------------ Utilitaires
  const $ = s => document.querySelector(s);
  const NF = new Intl.NumberFormat('fr-FR');
  const n0 = v => (v == null || Number.isNaN(v) ? '—' : NF.format(Math.round(v)));
  const sn = v => (v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + NF.format(Math.abs(Math.round(v))));
  const pct = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : (v * 100).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' %');
  const spct = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + pct(Math.abs(v), d));
  const big = v => {
    if (v == null) return '—';
    const a = Math.abs(v), s = v < 0 ? '−' : '';
    if (a >= 1e6) return s + (a / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M';
    if (a >= 1e5) return s + (a / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' k';
    return s + NF.format(a);
  };
  const key = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  const SMALL = new Set(['DE', 'DU', 'DES', 'LA', 'LE', 'LES', 'ET', 'D', 'L', 'SUR', 'EN']);
  const tc = s => String(s || '').toLowerCase().replace(/(^|[\s\-'(/])([a-zà-ÿ])/g, (m, p, c) => p + c.toUpperCase())
    .replace(/\b([A-Z][a-z]?)\b/g, (m) => (SMALL.has(m.toUpperCase()) ? m.toLowerCase() : m)).replace(/^./, c => c.toUpperCase());
  const ratio = (a, b) => (b ? a / b : null);
  const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
  const enc = encodeURIComponent;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
  const svgEl = (tag, attrs, ...kids) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    for (const c of kids.flat()) if (c != null) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  };

  // ------------------------------------------------------------------ Icônes (traits)
  const ICONS = {
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8"/>',
    box: '<path d="M4 7h16v13H4z"/><path d="M9 7V4h6v3"/><path d="M9 12h6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 17 4-6"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
    tent: '<path d="M3 20 12 4l9 16z"/><path d="M12 4v16"/><path d="m9 20 3-6 3 6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    swap: '<path d="M4 8h14l-3-3"/><path d="M20 16H6l3 3"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
    in: '<path d="M14 4h5v16h-5"/><path d="M3 12h11"/><path d="m10 8 4 4-4 4"/>',
    out: '<path d="M10 4H5v16h5"/><path d="M10 12h11"/><path d="m17 8 4 4-4 4"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    building: '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01M15 10h.01"/>',
  };
  const icon = (name, size = 32) => h('span', { class: 'ti', html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>` });

  // ------------------------------------------------------------------ Données
  let R = null;            // résumé
  const regionCache = {};  // fichiers régionaux
  const IDX = {};

  async function loadResume() {
    const res = await fetch('data/resume.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    R = await res.json();
    buildIndex();
  }
  function regionCode(name) { return name === 'ETR' ? 'ETRANGER' : key(name).replace(/ /g, '-'); }
  async function loadRegion(name) {
    const code = regionCode(name);
    if (!regionCache[code]) regionCache[code] = fetch('data/regions/' + code + '.json').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    return regionCache[code];
  }

  function buildIndex() {
    const byKey = (rows, f) => { const m = new Map(); rows.forEach(r => m.set(f(r), r)); return m; };
    IDX.carteRegSN = R.carte.regions.filter(r => r.zone === 'SN');
    IDX.carteRegETR = R.carte.regions.filter(r => r.zone === 'ETR');
    IDX.carteReg = byKey(IDX.carteRegSN, r => key(r.nom));
    IDX.cartePays = byKey(IDX.carteRegETR, r => key(r.nom));
    IDX.carteDep = byKey(R.carte.departements.filter(d => d.zone === 'SN'), d => key(d.region) + '|' + key(d.nom));
    IDX.carteCom = byKey(R.carte.communes, c => (c.zone === 'ETR' ? 'ETR|' : '') + key(c.region) + '|' + key(c.dept) + '|' + key(c.nom));
    IDX.evReg = byKey(R.evolution.regions, r => key(r.nom));
    IDX.evDep = byKey(R.evolution.departements, d => key(d.region) + '|' + key(d.nom));
    IDX.evCom = byKey(R.evolution.communes, c => key(c.region) + '|' + key(c.dept) + '|' + key(c.nom));
    IDX.cmpReg = byKey(R.comparatif.regions, r => key(r.nom));
    IDX.cmpDep = byKey(R.comparatif.departements, d => key(d.region) + '|' + key(d.nom));
    IDX.cmpCom = byKey(R.comparatif.communes, c => key(c.region) + '|' + key(c.dept) + '|' + key(c.nom));
    IDX.trDep = byKey(R.transferts.departements, d => key(d.nom));
    IDX.trCom = byKey(R.transferts.communes, c => key(c.region) + '|' + key(c.dept) + '|' + key(c.nom));
    const T = R.transferts, M = T.matrice;
    IDX.trReg = new Map(T.regions.map((nom, i) => {
      const sorties = sum(M[i], x => x), entrees = sum(M, row => row[i]);
      return [key(nom), { nom, entrees, sorties, solde: entrees - sorties }];
    }));
    IDX.regionNames = IDX.carteRegSN.map(r => r.nom).sort((a, b) => a.localeCompare(b, 'fr'));
  }

  // ------------------------------------------------------------------ Périmètre (filtres)
  // scope = { r: nom de région | 'ETR' | null, d: nom de département (ou pays) | null }
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, q] = raw.split('?');
    const params = new URLSearchParams(q || '');
    return { parts: (path || 'accueil').split('/').map(decodeURIComponent), r: params.get('r') || null, d: params.get('d') || null };
  }
  function hrefWith(page, scope) {
    const p = new URLSearchParams();
    if (scope.r) p.set('r', scope.r);
    if (scope.r && scope.d) p.set('d', scope.d);
    const q = p.toString();
    return '#/' + page + (q ? '?' + q : '');
  }
  const scopeLabel = s => (!s.r ? 'Ensemble du fichier' : s.r === 'ETR' ? (s.d ? tc(s.d) + ' (étranger)' : 'Étranger (diaspora)') : s.d ? 'Département de ' + tc(s.d) : 'Région de ' + tc(s.r));
  const ficheHref = s => (s.r === 'ETR' ? (s.d ? '#/fiche/pays/' + enc(s.d) : null) : s.d ? '#/fiche/dept/' + enc(s.r) + '/' + enc(s.d) : s.r ? '#/fiche/region/' + enc(s.r) : null);

  // ------------------------------------------------------------------ Agrégats par module
  function carteScope(s) {
    if (!s.r) { const a = R.carte.totaux.SN, b = R.carte.totaux.ETR; return { electeurs: a.electeurs + b.electeurs, bureaux: a.bureaux + b.bureaux, lieux: a.lieux + b.lieux, petits: a.petits + b.petits, abris: a.abris + b.abris, communes: a.communes + b.communes, depts: a.depts }; }
    if (s.r === 'ETR') return s.d ? IDX.cartePays.get(key(s.d)) : R.carte.totaux.ETR;
    return s.d ? IDX.carteDep.get(key(s.r) + '|' + key(s.d)) : IDX.carteReg.get(key(s.r));
  }
  function carteChildren(s) {
    const row = (x, link, nom) => ({ nom: nom || x.nom, link, electeurs: x.electeurs, bureaux: x.bureaux, lieux: x.lieux, petits: x.petits, abris: x.abris, moy: ratio(x.electeurs, x.bureaux) });
    if (!s.r) return [...IDX.carteRegSN.map(r => row(r, hrefWith('carte', { r: r.nom }))), row(R.carte.totaux.ETR, hrefWith('carte', { r: 'ETR' }), 'ÉTRANGER (DIASPORA)')];
    if (s.r === 'ETR' && !s.d) return IDX.carteRegETR.map(r => row(r, hrefWith('carte', { r: 'ETR', d: r.nom })));
    if (s.r === 'ETR') return R.carte.communes.filter(c => c.zone === 'ETR' && key(c.region) === key(s.d)).map(c => row(c, '#/fiche/commune/ETR/' + enc(c.region) + '/' + enc(c.nom)));
    if (!s.d) return R.carte.departements.filter(d => d.zone === 'SN' && key(d.region) === key(s.r)).map(d => row(d, hrefWith('carte', { r: s.r, d: d.nom })));
    return R.carte.communes.filter(c => c.zone === 'SN' && key(c.region) === key(s.r) && key(c.dept) === key(s.d)).map(c => row(c, '#/fiche/commune/' + enc(c.region) + '/' + enc(c.dept) + '/' + enc(c.nom)));
  }

  const evTotal = rows => ({ e2019: sum(rows, r => r.e2019), disparus: sum(rows, r => r.disparus), sortis: sum(rows, r => r.sortis), venus: sum(rows, r => r.venus), nouveaux: sum(rows, r => r.nouveaux), e2022: sum(rows, r => r.e2022) });
  function evScope(s) {
    if (s.r === 'ETR') return null;
    if (!s.r) return evTotal(R.evolution.regions);
    return s.d ? IDX.evDep.get(key(s.r) + '|' + key(s.d)) : IDX.evReg.get(key(s.r));
  }
  function evChildren(s) {
    if (s.r === 'ETR') return [];
    if (!s.r) return R.evolution.regions.map(r => ({ ...r, link: hrefWith('evolution', { r: r.nom }) }));
    if (!s.d) return R.evolution.departements.filter(d => key(d.region) === key(s.r)).map(d => ({ ...d, link: hrefWith('evolution', { r: s.r, d: d.nom }) }));
    return R.evolution.communes.filter(c => key(c.region) === key(s.r) && key(c.dept) === key(s.d)).map(c => ({ ...c, link: '#/fiche/commune/' + enc(c.region) + '/' + enc(c.dept) + '/' + enc(c.nom) }));
  }

  const cmpTotal = rows => ({ centresL: sum(rows, r => r.centresL), centresLG: sum(rows, r => r.centresLG), bureauxL: sum(rows, r => r.bureauxL), bureauxLG: sum(rows, r => r.bureauxLG), electeursL: sum(rows, r => r.electeursL), electeursLG: sum(rows, r => r.electeursLG) });
  function cmpScope(s) {
    if (s.r === 'ETR') return null;
    if (!s.r) return cmpTotal(R.comparatif.regions);
    return s.d ? IDX.cmpDep.get(key(s.r) + '|' + key(s.d)) : IDX.cmpReg.get(key(s.r));
  }
  function cmpChildren(s) {
    if (s.r === 'ETR') return [];
    if (!s.r) return R.comparatif.regions.map(r => ({ ...r, link: hrefWith('comparatif', { r: r.nom }) }));
    if (!s.d) return R.comparatif.departements.filter(d => key(d.region) === key(s.r)).map(d => ({ ...d, link: hrefWith('comparatif', { r: s.r, d: d.nom }) }));
    return R.comparatif.communes.filter(c => key(c.region) === key(s.r) && key(c.dept) === key(s.d)).map(c => ({ ...c, link: '#/fiche/commune/' + enc(c.region) + '/' + enc(c.dept) + '/' + enc(c.nom) }));
  }
  const inScope = (s, row, rk = 'region', dk = 'dept') => (!s.r || key(row[rk]) === key(s.r)) && (!s.d || key(row[dk]) === key(s.d));

  function trScope(s) {
    if (s.r === 'ETR') return null;
    if (!s.r) return { entrees: R.transferts.totaux.regions, sorties: R.transferts.totaux.regions, solde: 0, national: true };
    return s.d ? IDX.trDep.get(key(s.d)) : IDX.trReg.get(key(s.r));
  }
  function trChildren(s) {
    if (s.r === 'ETR') return [];
    if (!s.r) return [...IDX.trReg.values()].map(r => ({ ...r, link: hrefWith('transferts', { r: r.nom }) }));
    if (!s.d) return R.transferts.departements.filter(d => key(d.region) === key(s.r)).map(d => ({ ...d, link: hrefWith('transferts', { r: s.r, d: d.nom }) }));
    return R.transferts.communes.filter(c => key(c.region) === key(s.r) && key(c.dept) === key(s.d)).map(c => ({ ...c, link: '#/fiche/commune/' + enc(c.region) + '/' + enc(c.dept) + '/' + enc(c.nom) }));
  }

  // ------------------------------------------------------------------ Composants : tuiles
  function tile(t) {
    const tag = t.href ? 'a' : 'div';
    if (t.alt) return h(tag, { class: 'tile alt', href: t.href }, h('div', { class: 'tt' }, t.title), h('div', { class: 'ts' }, t.sub), h('div', { class: 'tplus' }, '+'));
    return h(tag, { class: 'tile', href: t.href, 'data-tip': t.tip },
      t.badge ? h('span', { class: 'badge ' + t.badge }, BADGE[t.badge]) : null,
      h('div', { class: 'tt' }, t.title), h('div', { class: 'ts' }, t.sub),
      h('div', { class: 'tb' }, icon(t.icon), h('div', null, h('div', { class: 'tv num ' + (t.cls || '') }, t.value), h('div', { class: 'tc' }, t.caption))));
  }
  const tiles = list => h('div', { class: 'tiles' }, list.filter(Boolean).map(tile));
  const section = (title, hint, ...content) => [h('h2', { class: 'section-title' }, title, hint ? h('span', { class: 'hint' }, hint) : null), ...content];
  const BADGE = { critique: 'Critique', attention: 'À vérifier', info: 'Information', ok: 'Conforme' };

  function tilesCarte(s) {
    const c = carteScope(s);
    if (!c) return [];
    const etr = R.carte.totaux.ETR;
    return [
      { title: 'Électeurs inscrits', sub: 'Législatives 2022', icon: 'users', value: big(c.electeurs), caption: 'électeurs', href: hrefWith('carte', s), tip: n0(c.electeurs) + ' électeurs' },
      { title: 'Bureaux de vote', sub: 'Carte électorale 2022', icon: 'box', value: n0(c.bureaux), caption: 'bureaux', href: hrefWith('carte', s) },
      { title: 'Lieux de vote', sub: 'Centres et écoles', icon: 'pin', value: n0(c.lieux), caption: 'lieux de vote', href: hrefWith('carte', s) },
      { title: 'Charge des bureaux', sub: 'Moyenne par bureau', icon: 'gauge', value: n0(ratio(c.electeurs, c.bureaux)), caption: 'électeurs / bureau', href: hrefWith('carte', s) + '#histo' },
      { title: 'Petits bureaux', sub: `Moins de ${R.seuilPetitBureau} électeurs`, icon: 'alert', value: n0(c.petits), caption: 'bureaux', cls: c.petits ? 'warn' : '', href: '#/qualite/bureaux-petits' },
      s.r === 'ETR' ? null : { title: 'Abris provisoires', sub: 'Bureaux hors bâtiment', icon: 'tent', value: n0(c.abris), caption: pct(ratio(c.abris, c.bureaux)) + ' des bureaux', href: hrefWith('carte', s) + '#implantation' },
      !s.r ? { title: 'Diaspora', sub: `${IDX.carteRegETR.length} pays de vote`, icon: 'globe', value: big(etr.electeurs), caption: pct(ratio(etr.electeurs, c.electeurs)) + ' du fichier', href: hrefWith('carte', { r: 'ETR' }) } : null,
    ];
  }
  function tilesEvolution(s) {
    const e = evScope(s);
    if (!e) return [];
    const g = e.e2019 ? ratio(e.e2022 - e.e2019, e.e2019) : null;
    const zone = !s.r ? 'région' : s.d ? 'département' : 'région';
    return [
      { title: 'Électeurs 2019', sub: 'Point de départ', icon: 'users', value: big(e.e2019), caption: 'électeurs', href: hrefWith('evolution', s), tip: n0(e.e2019) },
      { title: 'Électeurs 2022', sub: 'Territoire national, après révision', icon: 'users', value: big(e.e2022), caption: 'électeurs', href: hrefWith('evolution', s), tip: n0(e.e2022) },
      { title: 'Croissance', sub: '2019 → 2022', icon: 'trend', value: g == null ? '—' : spct(g), caption: sn(e.e2022 - (e.e2019 || 0)) + ' électeurs', cls: g > 0 ? 'up' : g < 0 ? 'down' : '', href: hrefWith('evolution', s) },
      { title: 'Nouveaux inscrits', sub: 'Primo-inscriptions', icon: 'plus', value: big(e.nouveaux), caption: pct(ratio(e.nouveaux, e.e2019)) + ' de 2019', href: hrefWith('evolution', s) },
      { title: 'Électeurs disparus', sub: 'Radiés du fichier', icon: 'minus', value: n0(e.disparus), caption: 'électeurs', href: hrefWith('evolution', s) },
      { title: 'Mobilité', sub: `Sortis / venus d'une autre ${zone}`, icon: 'swap', value: big(e.sortis), caption: 'sortis · ' + big(e.venus) + ' venus', href: hrefWith('evolution', s) },
    ];
  }
  function tilesComparatif(s) {
    const c = cmpScope(s);
    if (!c) return [];
    const d = c.electeursLG - c.electeursL;
    const sup = R.comparatif.supprimesNouveaux.filter(x => inScope(s, x));
    const fortes = R.comparatif.fortesVariations.filter(x => inScope(s, x));
    return [
      { title: 'Variation des électeurs', sub: 'Locales → Législatives 2022', icon: 'trend', value: spct(ratio(d, c.electeursL)), caption: sn(d) + ' électeurs', cls: d > 0 ? 'up' : d < 0 ? 'down' : '', href: hrefWith('comparatif', s) },
      { title: 'Bureaux de vote', sub: 'Créés ou supprimés', icon: 'box', value: sn(c.bureauxLG - c.bureauxL), caption: n0(c.bureauxL) + ' → ' + n0(c.bureauxLG), href: hrefWith('comparatif', s) },
      { title: 'Centres de vote', sub: 'Solde des ouvertures', icon: 'building', value: sn(c.centresLG - c.centresL), caption: n0(c.centresL) + ' → ' + n0(c.centresLG), href: hrefWith('comparatif', s) },
      { title: 'Centres supprimés ou nouveaux', sub: 'Entre les deux scrutins', icon: 'pin', value: n0(sup.length), caption: sup.filter(x => x.electeursLG == null).length + ' supprimés · ' + sup.filter(x => x.electeursL == null).length + ' nouveaux', href: hrefWith('comparatif', s) + '#supprimes' },
      { title: 'Fortes variations', sub: `±${R.comparatif.seuilsForteVariation.absolu} électeurs ou ±${R.comparatif.seuilsForteVariation.relatif * 100} %`, icon: 'alert', value: n0(fortes.length), caption: 'centres de vote', cls: fortes.length ? 'warn' : '', href: hrefWith('comparatif', s) + '#fortes' },
    ];
  }
  function tilesTransferts(s) {
    const t = trScope(s);
    if (!t) return [];
    const T = R.transferts;
    if (t.national) {
      const best = T.departements[0], worst = T.departements[T.departements.length - 1];
      return [
        { title: 'Changements de commune', sub: 'Locales → Législatives 2022', icon: 'swap', value: big(T.totaux.communes), caption: 'électeurs transférés', href: hrefWith('transferts', s) },
        { title: 'Entre départements', sub: 'Transferts inter-départements', icon: 'swap', value: big(T.totaux.departements), caption: 'électeurs', href: hrefWith('transferts', s) },
        { title: 'Entre régions', sub: 'Matrice des flux', icon: 'grid', value: big(T.totaux.regions), caption: 'électeurs', href: hrefWith('transferts', s) + '#matrice' },
        { title: 'Plus attractif', sub: 'Département au solde le plus élevé', icon: 'in', value: sn(best.solde), caption: tc(best.nom), cls: 'up', href: hrefWith('transferts', { r: best.region, d: best.nom }) },
        { title: 'Plus forte perte', sub: 'Département au solde le plus bas', icon: 'out', value: sn(worst.solde), caption: tc(worst.nom), cls: 'down', href: hrefWith('transferts', { r: worst.region, d: worst.nom }) },
      ];
    }
    return [
      { title: 'Électeurs entrants', sub: s.d ? "Venus d'autres départements" : "Venus d'autres régions", icon: 'in', value: n0(t.entrees), caption: 'électeurs', href: hrefWith('transferts', s) },
      { title: 'Électeurs sortants', sub: s.d ? 'Partis vers un autre département' : 'Partis vers une autre région', icon: 'out', value: n0(t.sorties), caption: 'électeurs', href: hrefWith('transferts', s) },
      { title: 'Solde migratoire', sub: 'Entrants − sortants', icon: 'trend', value: sn(t.solde), caption: 'électeurs', cls: t.solde > 0 ? 'up' : t.solde < 0 ? 'down' : '', href: hrefWith('transferts', s) },
    ];
  }
  function tilesQualite() {
    return R.qualite.map(c => ({
      title: c.titre, sub: c.detail.length > 70 ? c.detail.slice(0, 68) + '…' : c.detail, icon: c.gravite === 'ok' ? 'check' : 'alert', badge: c.gravite,
      value: n0(c.lignes.length), caption: c.lignes.length > 1 ? 'lignes' : 'ligne', cls: c.gravite === 'critique' ? 'down' : c.gravite === 'attention' ? 'warn' : '', href: '#/qualite/' + c.id, tip: c.detail,
    }));
  }

  // ------------------------------------------------------------------ Composants : tableau
  function table(opts) {
    const { cols, rows, pageSize = 25, exportName, searchable = true, onRow } = opts;
    let sortK = opts.sort || null, dir = opts.dir || -1, q = '', shown = pageSize;
    const root = h('div');
    const val = (c, r) => (c.get ? c.get(r) : r[c.k]);
    const draw = () => {
      let data = rows;
      if (q) { const kq = key(q); data = data.filter(r => cols.some(c => !c.num && key(val(c, r)).includes(kq))); }
      if (sortK) {
        const c = cols.find(x => x.k === sortK);
        data = [...data].sort((a, b) => {
          const va = val(c, a), vb = val(c, b);
          if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;
          return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fr')) * dir;
        });
      }
      const maxes = {};
      cols.filter(c => c.bar).forEach(c => { maxes[c.k] = Math.max(1, ...data.map(r => Math.abs(val(c, r) || 0))); });
      const body = data.slice(0, shown).map(r => h('tr', { class: onRow || r.link ? 'link' : null, onclick: onRow ? () => onRow(r) : r.link ? () => { location.hash = r.link; } : null },
        cols.map(c => {
          const v = val(c, r);
          if (c.bar === 'pos') return h('td', { class: 'bar' }, h('div', { class: 'cellbar', style: { width: (100 * Math.max(0, v || 0) / maxes[c.k]) + '%' } }));
          if (c.bar === 'div') return h('td', { class: 'bar', 'data-tip': c.fmt ? c.fmt(v, r) : v }, h('div', { class: 'divbar' }, h('span', { class: 'axis' }), v > 0 ? h('span', { class: 'pos', style: { width: (50 * v / maxes[c.k]) + '%' } }) : v < 0 ? h('span', { class: 'neg', style: { width: (50 * -v / maxes[c.k]) + '%' } }) : null));
          const txt = c.fmt ? c.fmt(v, r) : v == null ? '—' : c.num ? n0(v) : v;
          return h('td', { class: (c.num ? 'n ' : '') + (c.cls ? c.cls(v, r) : '') }, txt);
        })));
      put(root,
        h('div', { class: 'tbl-tools' },
          searchable && rows.length > 8 ? h('input', { type: 'search', placeholder: 'Filtrer…', value: q, oninput: e => { q = e.target.value; shown = pageSize; draw(); const i = root.querySelector('input'); i.focus(); i.setSelectionRange(q.length, q.length); } }) : null,
          h('span', { class: 'count' }, n0(data.length) + ' ligne' + (data.length > 1 ? 's' : '')),
          exportName ? h('button', { class: 'btn right', onclick: () => exportCsv(exportName, cols.filter(c => !c.bar), data, val) }, 'Exporter (CSV)') : null),
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
          h('thead', null, h('tr', null, cols.map(c => h('th', { class: c.num || c.bar ? 'n' : null, title: c.title, onclick: c.bar ? null : () => { if (sortK === c.k) dir = -dir; else { sortK = c.k; dir = c.num ? -1 : 1; } draw(); } }, c.label, sortK === c.k ? h('span', { class: 'arrow' }, dir > 0 ? ' ▲' : ' ▼') : null)))),
          h('tbody', null, body.length ? body : h('tr', null, h('td', { colspan: cols.length, class: 'empty' }, 'Aucune donnée pour ce périmètre.'))))),
        data.length > shown ? h('div', { class: 'more' }, h('button', { class: 'btn', onclick: () => { shown += pageSize * 4; draw(); } }, `Afficher plus (${n0(data.length - shown)} restantes)`)) : null);
    };
    draw();
    return root;
  }
  function exportCsv(name, cols, data, val) {
    const esc = v => { const s = v == null ? '' : String(v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [cols.map(c => esc(c.label)).join(';')].concat(data.map(r => cols.map(c => { const v = val(c, r); return esc(typeof v === 'number' ? String(v).replace('.', ',') : v); }).join(';')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: name + '.csv' });
    document.body.append(a); a.click(); a.remove();
  }

  // ------------------------------------------------------------------ Composants : graphiques
  function barList(items, fmtv = n0) {
    const max = Math.max(1, ...items.map(i => i.value));
    return h('div', { class: 'bars' }, items.map(i => h('div', { class: 'row' + (i.href ? ' link' : ''), onclick: i.href ? () => { location.hash = i.href; } : null, 'data-tip': i.tip || `<b>${i.label}</b><br>${fmtv(i.value)}` },
      h('span', { class: 'lbl' }, i.label), h('span', { class: 'track' }, h('span', { class: 'fill', style: { width: (100 * i.value / max) + '%' } })), h('span', { class: 'val' }, fmtv(i.value)))));
  }

  function histogram(bounds, counts, unit) {
    const W = 640, H = 220, pl = 44, pb = 34, pt = 18, n = counts.length, bw = (W - pl) / n;
    const max = Math.max(1, ...counts), total = sum(counts, x => x);
    const step = niceStep(max), ticks = [];
    for (let v = 0; v <= max; v += step) ticks.push(v);
    const y = v => pt + (H - pt - pb) * (1 - v / (ticks[ticks.length - 1] + (max > ticks[ticks.length - 1] ? step : 0) || 1));
    const top = ticks[ticks.length - 1] < max ? ticks[ticks.length - 1] + step : ticks[ticks.length - 1];
    const yy = v => pt + (H - pt - pb) * (1 - v / top);
    if (top !== ticks[ticks.length - 1]) ticks.push(top);
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Distribution des bureaux selon le nombre d\'électeurs' },
      ticks.map(v => svgEl('g', null, svgEl('line', { x1: pl, x2: W, y1: yy(v), y2: yy(v), stroke: '#e1e6ed', 'stroke-width': 1 }), svgEl('text', { x: pl - 6, y: yy(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, NF.format(v)))),
      counts.map((c, i) => {
        const x = pl + i * bw, hgt = H - pb - yy(c);
        const g = svgEl('g', { class: 'col', 'data-tip': `<b>${bounds[i]} à ${bounds[i + 1] - 1} électeurs</b><br>${n0(c)} ${unit} (${pct(ratio(c, total))})` },
          svgEl('rect', { class: 'm', x: x + 2, y: yy(c), width: bw - 4, height: Math.max(0, hgt), rx: 3, fill: '#00853f' }),
          svgEl('rect', { x, y: pt, width: bw, height: H - pt - pb, fill: 'transparent' }));
        return g;
      }),
      svgEl('line', { x1: pl, x2: W, y1: H - pb, y2: H - pb, stroke: '#8995a3', 'stroke-width': 1 }),
      counts.map((c, i) => (i % 2 === 0 ? svgEl('text', { x: pl + i * bw + bw / 2, y: H - pb + 16, 'text-anchor': 'middle', class: 'axis-label' }, String(bounds[i])) : null)),
      svgEl('text', { x: W, y: H - 2, 'text-anchor': 'end', class: 'axis-label' }, 'électeurs par bureau →'));
    void y;
    return h('div', { class: 'chart' }, svg);
  }
  function niceStep(max) {
    const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  }

  // Bilan 2019 → 2022 en cascade
  function waterfall(e) {
    const steps = [
      { label: 'Électeurs 2019', v: e.e2019, total: true },
      { label: 'Disparus', v: -(e.disparus || 0) },
      { label: 'Sortis', v: -(e.sortis || 0) },
      { label: 'Venus', v: e.venus || 0 },
      { label: 'Nouveaux inscrits', v: e.nouveaux || 0 },
      { label: 'Électeurs 2022', v: e.e2022, total: true },
    ];
    let run = 0; const bars = steps.map(s => { if (s.total) { run = s.v; return { ...s, a: 0, b: s.v }; } const a = run; run += s.v; return { ...s, a: Math.min(a, run), b: Math.max(a, run) }; });
    const lo = Math.min(...bars.filter(b => !b.total).map(b => b.a), e.e2019, e.e2022), hi = Math.max(...bars.map(b => b.b));
    const base = Math.max(0, lo - (hi - lo) * 0.6); // axe tronqué pour rendre les flux lisibles, signalé sous le graphique
    const W = 640, H = 240, pl = 8, pb = 40, pt = 22, bw = (W - pl) / steps.length;
    const yy = v => pt + (H - pt - pb) * (1 - (v - base) / (hi - base || 1));
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Bilan des électeurs de 2019 à 2022' },
      bars.map((b, i) => {
        const x = pl + i * bw + 10, color = b.total ? '#0e2a47' : b.v >= 0 ? '#00853f' : '#e31b23';
        return svgEl('g', { 'data-tip': `<b>${b.label}</b><br>${b.total ? n0(b.v) : sn(b.v)} électeurs` },
          svgEl('rect', { x, y: yy(b.b), width: bw - 20, height: Math.max(2, yy(b.a > base ? b.a : base) - yy(b.b)), rx: 3, fill: color }),
          svgEl('text', { x: x + (bw - 20) / 2, y: yy(b.b) - 6, 'text-anchor': 'middle', class: 'val-label' }, b.total ? big(b.v) : sn(b.v)),
          svgEl('text', { x: x + (bw - 20) / 2, y: H - pb + 18, 'text-anchor': 'middle', class: 'axis-label' }, b.label));
      }),
      svgEl('line', { x1: pl, x2: W, y1: H - pb, y2: H - pb, stroke: '#8995a3' }));
    return h('div', { class: 'chart' }, svg, h('div', { class: 'legend' },
      h('span', null, h('i', { style: { background: '#0e2a47' } }), 'Stock d\'électeurs'), h('span', null, h('i', { style: { background: '#00853f' } }), 'Entrées'), h('span', null, h('i', { style: { background: '#e31b23' } }), 'Sorties'),
      h('span', null, `Axe vertical commençant à ${big(base)} pour rendre les flux visibles.`)));
  }

  function matrix(hl) {
    const T = R.transferts, M = T.matrice, names = T.regions;
    const max = Math.max(...M.flat());
    const hk = hl ? key(hl) : null;
    const cell = (v, i, j) => {
      if (i === j) return h('td', { class: 'diag', 'data-tip': 'Même région' });
      const a = v / max, on = !hk || key(names[i]) === hk || key(names[j]) === hk;
      return h('td', { style: { background: `rgba(0,133,63,${(0.06 + 0.94 * Math.sqrt(a)) * (on ? 1 : 0.25)})`, color: a > 0.3 && on ? '#fff' : on ? '#1d2733' : '#8995a3' }, 'data-tip': `<b>${tc(names[i])} → ${tc(names[j])}</b><br>${n0(v)} électeurs` }, v ? NF.format(v) : '');
    };
    return h('div', { class: 'tbl-wrap' }, h('table', { class: 'matrix' },
      h('thead', null, h('tr', null, h('th', null, 'Origine ↓ / Destination →'), names.map(n => h('th', { class: 'col' }, tc(n))), h('th', { class: 'col' }, 'Total sorties'))),
      h('tbody', null, M.map((row, i) => h('tr', null, h('th', { style: { textAlign: 'right' } }, h('a', { href: hrefWith('transferts', { r: names[i] }) }, tc(names[i]))), row.map((v, j) => cell(v, i, j)), h('td', { class: 'tot' }, NF.format(sum(row, x => x))))),
        h('tr', null, h('th', { style: { textAlign: 'right' } }, 'Total entrées'), names.map((n, j) => h('td', { class: 'tot' }, NF.format(sum(M, r => r[j])))), h('td', { class: 'tot' }, NF.format(R.transferts.totaux.regions))))));
  }

  const panel = (title, sub, ...content) => h('div', { class: 'panel' }, h('h3', null, title), sub ? h('div', { class: 'sub' }, sub) : null, ...content);

  // ------------------------------------------------------------------ Navigation
  const TABS = [
    ['accueil', 'Mon accueil'], ['carte', 'Carte électorale 2022'], ['evolution', 'Évolution 2019 → 2022'], ['comparatif', 'Locales → Législatives'],
    ['transferts', 'Transferts d\'électeurs'], ['qualite', 'Qualité des données'], ['sources', 'Sources & méthode'],
  ];
  function renderTabs(page, s) {
    $('#tabs').replaceChildren(...TABS.map(([id, label]) => h('a', { href: id === 'sources' || id === 'qualite' ? '#/' + id : hrefWith(id, s), class: page === id ? 'active' : null }, label)));
  }
  function renderFilters(page, s) {
    const box = $('#filters');
    if (['sources', 'qualite', 'fiche'].includes(page)) { box.replaceChildren(); return; }
    const go = ns => { location.hash = hrefWith(page, ns); };
    const rSel = h('select', { id: 'f-region', onchange: e => go({ r: e.target.value || null }) },
      h('option', { value: '' }, 'Tout le fichier'), IDX.regionNames.map(n => h('option', { value: n, selected: s.r && key(s.r) === key(n) }, tc(n))),
      h('option', { value: 'ETR', selected: s.r === 'ETR' }, 'Étranger (diaspora)'));
    let deps = [];
    if (s.r === 'ETR') deps = IDX.carteRegETR.map(r => r.nom).sort((a, b) => a.localeCompare(b, 'fr'));
    else if (s.r) deps = R.carte.departements.filter(d => d.zone === 'SN' && key(d.region) === key(s.r)).map(d => d.nom).sort((a, b) => a.localeCompare(b, 'fr'));
    const dSel = h('select', { id: 'f-dept', disabled: !s.r, onchange: e => go({ r: s.r, d: e.target.value || null }) },
      h('option', { value: '' }, s.r === 'ETR' ? 'Tous les pays' : 'Tous les départements'), deps.map(n => h('option', { value: n, selected: s.d && key(s.d) === key(n) }, tc(n))));
    const fiche = ficheHref(s);
    put(box, h('label', { for: 'f-region' }, 'Région'), rSel, h('label', { for: 'f-dept' }, s.r === 'ETR' ? 'Pays' : 'Département'), dSel,
      s.r ? h('button', { class: 'reset', onclick: () => go({}) }, '× Réinitialiser') : null,
      fiche ? h('a', { class: 'btn', href: fiche, style: { display: 'inline-flex', alignItems: 'center', marginLeft: 'auto' } }, 'Fiche complète : ' + scopeLabel(s)) : null);
  }

  function route() {
    hideTip();
    if (!R) return;
    const { parts, r, d } = parseHash();
    const s = { r, d: r ? d : null };
    const page = parts[0] || 'accueil';
    renderTabs(page, s);
    renderFilters(page, s);
    const view = $('#view');
    const pages = { accueil: pageAccueil, carte: pageCarte, evolution: pageEvolution, comparatif: pageComparatif, transferts: pageTransferts, qualite: pageQualite, sources: pageSources, fiche: pageFiche };
    const fn = pages[page] || pageAccueil;
    view.replaceChildren(h('div', { class: 'loading' }, 'Chargement…'));
    Promise.resolve(fn(s, parts.slice(1))).then(nodes => {
      view.replaceChildren(...[].concat(nodes).flat().filter(Boolean));
      const anchor = location.hash.split('#')[2];
      if (anchor) { const el = document.getElementById(anchor); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else window.scrollTo({ top: 0 });
    }).catch(err => { console.error(err); view.replaceChildren(h('div', { class: 'note warn' }, 'Impossible d\'afficher cette page : ' + err.message)); });
  }

  // ------------------------------------------------------------------ Pages
  function pageAccueil(s) {
    const q = tilesQualite().filter(t => t.badge !== 'ok').slice(0, 3);
    const scopeNote = s.r ? h('p', { class: 'crumbs' }, 'Périmètre : ', h('b', null, scopeLabel(s))) : null;
    return [scopeNote,
      section('Carte électorale 2022', 'Législatives — bureaux et lieux de vote', tiles(tilesCarte(s))),
      s.r === 'ETR' ? h('div', { class: 'note stack' }, 'Les modules Évolution, Locales → Législatives et Transferts ne couvrent que le territoire national.') : null,
      s.r !== 'ETR' ? section('Évolution du fichier 2019 → 2022', 'Inscriptions, radiations et mobilité', tiles(tilesEvolution(s).slice(1, 6))) : null,
      s.r !== 'ETR' ? section('Locales → Législatives 2022', 'Ce qui a changé entre les deux scrutins', tiles(tilesComparatif(s))) : null,
      s.r !== 'ETR' ? section('Transferts d\'électeurs', 'Changements d\'inscription entre zones', tiles(tilesTransferts(s))) : null,
      section('Qualité des données', 'Contrôles automatiques', tiles([...q, { alt: true, title: 'Voir tous les contrôles', sub: `${R.qualite.length} contrôles de cohérence`, href: '#/qualite' }])),
      section('Données', null, tiles([
        { title: 'Sources', sub: 'Fichiers analysés', icon: 'file', value: n0(R.sources.length), caption: 'fichiers', href: '#/sources' },
        { alt: true, title: 'Ajouter des données', sub: 'Nouveau scrutin, nouvelle révision', href: '#/sources#maj' },
      ])),
    ];
  }

  async function pageCarte(s) {
    const rows = carteChildren(s);
    const levelName = !s.r ? 'Région' : s.r === 'ETR' ? (s.d ? 'Ville' : 'Pays') : s.d ? 'Commune' : 'Département';
    const tot = sum(rows, r => r.electeurs);
    const tbl = table({
      rows, sort: 'electeurs', exportName: 'carte-electorale-' + (s.d || s.r || 'national'),
      cols: [
        { k: 'nom', label: levelName, fmt: v => tc(v) },
        { k: 'electeurs', label: 'Électeurs', num: true },
        { k: 'part', label: 'Part', num: true, get: r => ratio(r.electeurs, tot), fmt: v => pct(v) },
        { k: 'bar', label: '', bar: 'pos', get: r => r.electeurs },
        { k: 'bureaux', label: 'Bureaux', num: true },
        { k: 'lieux', label: 'Lieux de vote', num: true },
        { k: 'moy', label: 'Électeurs / bureau', num: true },
        { k: 'petits', label: `< ${R.seuilPetitBureau} élect.`, num: true },
        { k: 'abris', label: 'Abris provisoires', num: true },
      ],
    });
    // Distribution des bureaux et implantation : niveau national pré-calculé, sinon calcul depuis le fichier régional
    let counts, impl, unit = 'bureaux';
    if (!s.r) { counts = R.carte.histo.SN.map((c, i) => c + R.carte.histo.ETR[i]); impl = R.carte.implantation; }
    else {
      const data = await loadRegion(s.r);
      const lieux = data.lieux.filter(l => !s.d || key(s.r === 'ETR' ? l.region : l.dept) === key(s.d));
      const b = lieux.flatMap(l => l.bureaux);
      counts = R.carte.histo.bornes.slice(0, -1).map(() => 0);
      b.forEach(x => { counts[Math.min(Math.floor(x[1] / 50), counts.length - 1)]++; });
      const m = new Map(); b.forEach(x => { const t = implType(x[2]); m.set(t, (m.get(t) || 0) + 1); });
      impl = [...m.entries()].sort((a, c) => c[1] - a[1]);
    }
    const totB = sum(impl, x => x[1]);
    return [
      section('Carte électorale 2022', scopeLabel(s), tiles(tilesCarte(s))),
      h('div', { class: 'stack' }, panel(`Répartition par ${levelName.toLowerCase()}`, 'Cliquez sur une ligne pour descendre d\'un niveau.', tbl)),
      h('div', { class: 'grid2 stack' },
        h('div', { class: 'panel', id: 'histo' }, h('h3', null, 'Taille des bureaux de vote'), h('div', { class: 'sub' }, 'Nombre de bureaux selon le nombre d\'électeurs inscrits (tranches de 50).'), histogram(R.carte.histo.bornes, counts, unit)),
        h('div', { class: 'panel', id: 'implantation' }, h('h3', null, 'Implantation des bureaux'), h('div', { class: 'sub' }, 'Type de salle déclaré dans la carte électorale.'),
          barList(impl.map(([t, v]) => ({ label: t, value: v, tip: `<b>${t}</b><br>${n0(v)} bureaux (${pct(ratio(v, totB))})` }))),
          s.r === 'ETR' ? h('p', { class: 'small muted' }, 'L\'implantation n\'est pas renseignée pour les bureaux à l\'étranger.') : null)),
    ];
  }
  function implType(s) {
    const k = key(s);
    if (!k) return 'Non renseignée';
    if (k.includes('ABRI')) return 'Abri provisoire';
    if (/CLASSE|SALLE|ECOLE/.test(k) || /^(CI|CP) /.test(k)) return 'Salle de classe';
    if (/MAIRIE|FOYER|CASE|MAISON|CENTRE/.test(k)) return 'Bâtiment communautaire';
    if (/MOSQUEE|EGLISE/.test(k)) return 'Lieu de culte';
    return 'Autre';
  }

  const etrNote = () => h('div', { class: 'note stack' }, 'Ce module ne couvre que le territoire national : aucune donnée pour l\'étranger. ', h('a', { href: hrefWith('carte', { r: 'ETR' }) }, 'Voir la carte électorale de la diaspora →'));

  function pageEvolution(s) {
    if (s.r === 'ETR') return [section('Évolution du fichier 2019 → 2022'), etrNote()];
    const e = evScope(s);
    const rows = evChildren(s);
    const levelName = !s.r ? 'Région' : s.d ? 'Commune' : 'Département';
    const growth = r => (r.e2019 ? ratio(r.e2022 - r.e2019, r.e2019) : null);
    return [
      section('Évolution du fichier 2019 → 2022', scopeLabel(s), tiles(tilesEvolution(s))),
      h('div', { class: 'grid2 stack' },
        e && e.e2019 != null ? panel('Bilan des électeurs', 'Du fichier 2019 au fichier 2022 : radiations, départs, arrivées et nouvelles inscriptions.', waterfall(e)) : panel('Bilan des électeurs', null, h('div', { class: 'note' }, 'Département créé après 2019 (issu de Pikine) : pas de fichier 2019 de référence.')),
        panel('Croissance par ' + levelName.toLowerCase(), 'Variation relative du nombre d\'électeurs entre 2019 et 2022.',
          barList(rows.filter(r => growth(r) != null).sort((a, b) => growth(b) - growth(a)).slice(0, 15).map(r => ({ label: tc(r.nom), value: Math.max(0, growth(r)), href: r.link, tip: `<b>${tc(r.nom)}</b><br>${spct(growth(r))} · ${sn(r.e2022 - r.e2019)} électeurs` })), v => spct(v)),
          rows.length > 15 ? h('p', { class: 'small muted' }, '15 plus fortes croissances ; tableau complet ci-dessous.') : null)),
      h('div', { class: 'stack' }, panel('Détail par ' + levelName.toLowerCase(), 'Taux de sortie = électeurs sortis / électeurs 2019. « — » : donnée non applicable.', table({
        rows, sort: 'e2022', exportName: 'evolution-2019-2022-' + (s.d || s.r || 'national'),
        cols: [
          { k: 'nom', label: levelName, fmt: v => tc(v) },
          { k: 'e2019', label: '2019', num: true },
          { k: 'disparus', label: 'Disparus', num: true },
          { k: 'sortis', label: 'Sortis', num: true },
          { k: 'venus', label: 'Venus', num: true },
          { k: 'nouveaux', label: 'Nouveaux', num: true },
          { k: 'e2022', label: '2022', num: true },
          { k: 'croissance', label: 'Croissance', num: true, get: growth, fmt: v => spct(v), cls: v => (v > 0 ? 'up' : v < 0 ? 'down' : '') },
          { k: 'cbar', label: '', bar: 'div', get: growth, fmt: v => spct(v) },
          { k: 'tsortie', label: 'Taux de sortie', num: true, get: r => (r.e2019 ? ratio(r.sortis, r.e2019) : null), fmt: v => pct(v) },
        ],
      }))),
    ];
  }

  function pageComparatif(s) {
    if (s.r === 'ETR') return [section('Locales → Législatives 2022'), etrNote()];
    const rows = cmpChildren(s);
    const levelName = !s.r ? 'Région' : s.d ? 'Commune' : 'Département';
    const dv = r => r.electeursLG - r.electeursL, dr = r => ratio(dv(r), r.electeursL);
    const sup = R.comparatif.supprimesNouveaux.filter(x => inScope(s, x));
    const fortes = R.comparatif.fortesVariations.filter(x => inScope(s, x));
    const lieuLink = x => '#/fiche/lieu/' + enc(x.region) + '/' + enc(x.dept) + '/' + enc(x.commune) + '/' + enc(x.nom);
    return [
      section('Locales → Législatives 2022', scopeLabel(s), tiles(tilesComparatif(s))),
      h('div', { class: 'stack' }, panel('Variation par ' + levelName.toLowerCase(), 'Centres, bureaux et électeurs aux Locales (janvier 2022) puis aux Législatives (juillet 2022).', table({
        rows, sort: 'electeursLG', exportName: 'locales-legislatives-' + (s.d || s.r || 'national'),
        cols: [
          { k: 'nom', label: levelName, fmt: v => tc(v) },
          { k: 'centresL', label: 'Centres L.', num: true, title: 'Centres de vote — Locales 2022' },
          { k: 'centresLG', label: 'Centres LG.', num: true, title: 'Centres de vote — Législatives 2022' },
          { k: 'bureauxL', label: 'Bureaux L.', num: true },
          { k: 'bureauxLG', label: 'Bureaux LG.', num: true },
          { k: 'electeursL', label: 'Électeurs L.', num: true },
          { k: 'electeursLG', label: 'Électeurs LG.', num: true },
          { k: 'delta', label: 'Variation', num: true, get: dv, fmt: v => sn(v), cls: v => (v > 0 ? 'up' : v < 0 ? 'down' : '') },
          { k: 'deltaR', label: 'Var. %', num: true, get: dr, fmt: v => spct(v, 2) },
          { k: 'dbar', label: '', bar: 'div', get: dr, fmt: v => spct(v, 2) },
        ],
      }))),
      h('div', { class: 'grid2 stack' },
        h('div', { class: 'panel', id: 'supprimes' }, h('h3', null, 'Centres supprimés ou nouveaux'), h('div', { class: 'sub' }, 'Centres présents à un seul des deux scrutins.'),
          table({ rows: sup, pageSize: 20, searchable: false, exportName: 'centres-supprimes-nouveaux', onRow: x => { if (x.electeursLG != null) location.hash = lieuLink(x); },
            cols: [{ k: 'nom', label: 'Centre', fmt: v => tc(v) }, { k: 'commune', label: 'Commune', fmt: v => tc(v) },
              { k: 'statut', label: 'Statut', get: x => (x.electeursLG == null ? 'Supprimé' : 'Nouveau'), cls: v => (v === 'Supprimé' ? 'down' : 'up') },
              { k: 'electeurs', label: 'Électeurs', num: true, get: x => x.electeursLG ?? x.electeursL }] })),
        h('div', { class: 'panel', id: 'fortes' }, h('h3', null, 'Fortes variations par centre'), h('div', { class: 'sub' }, `Centres dont l'effectif varie d'au moins ${R.comparatif.seuilsForteVariation.absolu} électeurs, ou de ${R.comparatif.seuilsForteVariation.relatif * 100} % (écart ≥ ${R.comparatif.seuilsForteVariation.relatifMin}).`),
          table({ rows: fortes, pageSize: 15, exportName: 'fortes-variations-centres', onRow: x => { location.hash = lieuLink(x); },
            cols: [{ k: 'nom', label: 'Centre', fmt: v => tc(v) }, { k: 'commune', label: 'Commune', fmt: v => tc(v) },
              { k: 'electeursL', label: 'L.', num: true }, { k: 'electeursLG', label: 'LG.', num: true },
              { k: 'delta', label: 'Variation', num: true, get: dv, fmt: v => sn(v), cls: v => (v > 0 ? 'up' : 'down') }], sort: 'delta' }))),
    ];
  }

  function pageTransferts(s) {
    if (s.r === 'ETR') return [section('Transferts d\'électeurs'), etrNote()];
    const rows = trChildren(s);
    const levelName = !s.r ? 'Région' : s.d ? 'Commune' : 'Département';
    const flux = R.transferts.fluxDepartements.filter(f => key(f[1]) !== key(f[3]) && (!s.r || (s.d ? key(f[1]) === key(s.d) || key(f[3]) === key(s.d) : key(f[0]) === key(s.r) || key(f[2]) === key(s.r))));
    const out = [
      section('Transferts d\'électeurs', scopeLabel(s) + ' — inscription aux Locales 2022 → inscription aux Législatives 2022', tiles(tilesTransferts(s))),
      h('div', { class: 'stack' }, panel('Solde par ' + levelName.toLowerCase(), s.d ? 'Flux entre communes (y compris au sein du département).' : s.r ? 'Flux entre départements (y compris au sein de la région).' : 'Flux entre régions.', table({
        rows, sort: 'solde', exportName: 'transferts-' + (s.d || s.r || 'national'),
        cols: [
          { k: 'nom', label: levelName, fmt: v => tc(v) },
          { k: 'entrees', label: 'Entrants', num: true },
          { k: 'sorties', label: 'Sortants', num: true },
          { k: 'solde', label: 'Solde', num: true, fmt: v => sn(v), cls: v => (v > 0 ? 'up' : v < 0 ? 'down' : '') },
          { k: 'sbar', label: '', bar: 'div', get: r => r.solde, fmt: v => sn(v) },
        ],
      }))),
    ];
    if (!s.d) out.push(h('div', { class: 'panel stack', id: 'matrice' }, h('h3', null, 'Matrice des transferts entre régions'), h('div', { class: 'sub' }, 'Ligne = région d\'origine (Locales), colonne = région de destination (Législatives). Intensité proportionnelle au nombre d\'électeurs.'), matrix(s.r)));
    out.push(h('div', { class: 'stack' }, panel('Principaux flux entre départements', 'Transferts les plus importants du périmètre.', table({
      rows: flux.map(f => ({ ro: f[0], o: f[1], rd: f[2], d: f[3], n: f[4] })), sort: 'n', pageSize: 15, exportName: 'flux-departements',
      onRow: f => { location.hash = hrefWith('transferts', { r: f.rd, d: f.d }); },
      cols: [{ k: 'o', label: 'Département d\'origine', fmt: v => tc(v) }, { k: 'ro', label: 'Région', fmt: v => tc(v) }, { k: 'd', label: 'Département de destination', fmt: v => tc(v) }, { k: 'rd', label: 'Région', fmt: v => tc(v) }, { k: 'n', label: 'Électeurs', num: true }, { k: 'nbar', label: '', bar: 'pos', get: f => f.n }],
    }))));
    return out;
  }

  function pageQualite(s, rest) {
    if (rest[0]) {
      const c = R.qualite.find(x => x.id === rest[0]);
      if (!c) return h('div', { class: 'note warn' }, 'Contrôle introuvable.');
      const rows = c.lignes.map(l => Object.fromEntries(l.map((v, i) => ['c' + i, v])));
      return [h('p', { class: 'crumbs' }, h('a', { href: '#/qualite' }, 'Qualité des données'), ' › ', c.titre),
        section(c.titre, null, h('span', { class: 'badge ' + c.gravite }, BADGE[c.gravite])),
        h('div', { class: 'note' }, c.detail),
        h('div', { class: 'stack' }, panel(n0(c.lignes.length) + ' ligne' + (c.lignes.length > 1 ? 's' : '') + ' concernée' + (c.lignes.length > 1 ? 's' : ''), null,
          c.lignes.length ? table({ rows, sort: null, pageSize: 50, exportName: 'controle-' + c.id, cols: c.colonnes.map((lab, i) => ({ k: 'c' + i, label: lab, num: rows.length && typeof rows[0]['c' + i] === 'number', fmt: v => (typeof v === 'number' ? n0(v) : v === '' || v == null ? '—' : tc(v)) })) })
            : h('div', { class: 'empty' }, 'Aucune anomalie détectée.')))];
    }
    const order = { critique: 0, attention: 1, info: 2, ok: 3 };
    return [section('Qualité des données', 'Contrôles de cohérence recalculés à chaque préparation des données', tiles(tilesQualite().sort((a, b) => order[a.badge] - order[b.badge]))),
      h('div', { class: 'note stack' }, 'Les contrôles portent sur l\'ensemble des fichiers (le filtre de périmètre ne s\'applique pas ici). Les libellés tronqués à 20 caractères dans les exports sont rapprochés automatiquement et signalés.')];
  }

  function pageSources() {
    return [section('Sources & méthode'),
      h('div', { class: 'stack' }, panel('Fichiers analysés', `Données préparées le ${new Date(R.genere).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
        table({ rows: R.sources, searchable: false, cols: [{ k: 'fichier', label: 'Fichier' }, { k: 'contenu', label: 'Contenu' }, { k: 'lignes', label: 'Lignes', num: true }] }))),
      h('div', { class: 'grid2 stack' },
        panel('Définitions', null, h('div', { html: `
          <p><b>Carte électorale</b> : une ligne par bureau de vote (région, département, commune, lieu de vote, n° de bureau, électeurs, implantation). À l'étranger, la région et le département correspondent au pays.</p>
          <p><b>Locales (L.) / Législatives (LG.)</b> : effectifs arrêtés pour les élections territoriales de janvier 2022 et législatives de juillet 2022.</p>
          <p><b>Transferts</b> : électeurs inscrits dans une zone aux Locales et dans une autre aux Législatives. Le solde d'une zone = entrants − sortants.</p>
          <p><b>Évolution 2019 → 2022</b> : électeurs 2022 = 2019 − disparus − sortis + venus + nouveaux inscrits ; l'équilibre est vérifié dans l'onglet Qualité.</p>
          <p><b>Taux de sortie</b> : électeurs sortis rapportés aux électeurs 2019.</p>` })),
        h('div', { class: 'panel', id: 'maj' }, h('h3', null, 'Mettre à jour ou ajouter des données'), h('div', { html: `
          <ol>
            <li>Déposer les nouveaux fichiers dans <code>fichier-electoral/data/sources/</code> (mêmes colonnes que les fichiers actuels).</li>
            <li>Lancer <code>python3 scripts/build_data.py</code> depuis le dossier <code>fichier-electoral</code>.</li>
            <li>Le script régénère <code>data/resume.json</code> (agrégats) et un fichier par région dans <code>data/regions/</code> (détail des bureaux, chargé à la demande).</li>
          </ol>
          <p class="small muted">Les fichiers CSV sont lus en UTF-8 ou Windows-1252, séparateur point-virgule.</p>` }))),
    ];
  }

  // ------------------------------------------------------------------ Fiches
  async function pageFiche(_s, rest) {
    const [lvl, ...p] = rest;
    if (lvl === 'region') return ficheZone({ r: p[0] }, 'region');
    if (lvl === 'dept') return ficheZone({ r: p[0], d: p[1] }, 'dept');
    if (lvl === 'pays') return fichePays(p[0]);
    if (lvl === 'commune') return p[0] === 'ETR' ? ficheCommune({ etr: true, r: p[1], d: p[1], c: p[2] }) : ficheCommune({ r: p[0], d: p[1], c: p[2] });
    if (lvl === 'lieu') return ficheLieu({ r: p[0], d: p[1], c: p[2], l: p[3] });
    return h('div', { class: 'note warn' }, 'Fiche inconnue.');
  }
  const crumbs = (...items) => h('p', { class: 'crumbs' }, h('a', { href: '#/accueil' }, 'Accueil'), items.map(([lab, href]) => [' › ', href ? h('a', { href }, tc(lab)) : tc(lab)]));
  const kpi = (k, v, d, cls) => h('div', { class: 'kpi' }, h('div', { class: 'k' }, k), h('div', { class: 'v num ' + (cls || '') }, v), d ? h('div', { class: 'd' }, d) : null);

  function kpisFor(c, e, m, t) {
    const out = [];
    if (c) out.push(kpi('Électeurs 2022 (LG.)', n0(c.electeurs)), kpi('Bureaux de vote', n0(c.bureaux), n0(ratio(c.electeurs, c.bureaux)) + ' électeurs / bureau'), kpi('Lieux de vote', n0(c.lieux)), kpi('Abris provisoires', n0(c.abris), pct(ratio(c.abris, c.bureaux)) + ' des bureaux'));
    if (e && e.e2019 != null) out.push(kpi('Croissance 2019 → 2022', spct(ratio(e.e2022 - e.e2019, e.e2019)), sn(e.e2022 - e.e2019) + ' électeurs', e.e2022 >= e.e2019 ? 'up' : 'down'), kpi('Nouveaux inscrits', n0(e.nouveaux), 'depuis 2019'));
    if (m) out.push(kpi('Locales → Législatives', spct(ratio(m.electeursLG - m.electeursL, m.electeursL), 2), sn(m.electeursLG - m.electeursL) + ' électeurs', m.electeursLG >= m.electeursL ? 'up' : 'down'));
    if (t) out.push(kpi('Solde des transferts', sn(t.solde), n0(t.entrees) + ' entrants · ' + n0(t.sorties) + ' sortants', t.solde > 0 ? 'up' : t.solde < 0 ? 'down' : ''));
    return h('div', { class: 'kpis' }, out);
  }

  function ficheZone(s, lvl) {
    const c = carteScope(s), e = evScope(s), m = cmpScope(s), t = trScope(s);
    if (!c) return h('div', { class: 'note warn' }, 'Zone introuvable dans la carte électorale.');
    const childS = lvl === 'region' ? { r: s.r } : { r: s.r, d: s.d };
    const cRows = carteChildren(childS);
    const eRows = new Map(evChildren(childS).map(x => [key(x.nom), x]));
    const mRows = new Map(cmpChildren(childS).map(x => [key(x.nom), x]));
    const tRows = new Map(trChildren(childS).map(x => [key(x.nom), x]));
    const rows = cRows.map(x => {
      const k = key(x.nom), ee = eRows.get(k), mm = mRows.get(k), tt = tRows.get(k);
      const childHref = lvl === 'region' ? '#/fiche/dept/' + enc(s.r) + '/' + enc(x.nom) : '#/fiche/commune/' + enc(s.r) + '/' + enc(s.d) + '/' + enc(x.nom);
      return { ...x, link: childHref, croiss: ee && ee.e2019 ? ratio(ee.e2022 - ee.e2019, ee.e2019) : null, nouveaux: ee ? ee.nouveaux : null, varLG: mm ? ratio(mm.electeursLG - mm.electeursL, mm.electeursL) : null, solde: tt ? tt.solde : null };
    });
    const child = lvl === 'region' ? 'Département' : 'Commune';
    const flux = R.transferts.fluxDepartements.filter(f => key(f[1]) !== key(f[3]) && (lvl === 'dept' ? key(f[1]) === key(s.d) || key(f[3]) === key(s.d) : key(f[0]) === key(s.r) && key(f[2]) !== key(s.r) || key(f[2]) === key(s.r) && key(f[0]) !== key(s.r)));
    const zoneKey = k => (lvl === 'dept' ? key(k[1]) === key(s.d) : key(k[0]) === key(s.r));
    const inFlows = flux.filter(f => !zoneKey(f) && (lvl === 'dept' ? key(f[3]) === key(s.d) : key(f[2]) === key(s.r)));
    const outFlows = flux.filter(f => zoneKey(f));
    const flowList = (arr, other) => barList(arr.slice(0, 8).map(f => ({ label: tc(other(f)), value: f[4] })));
    return [
      lvl === 'region' ? crumbs(['Région de ' + s.r]) : crumbs(['Région de ' + s.r, '#/fiche/region/' + enc(s.r)], ['Département de ' + s.d]),
      section(lvl === 'region' ? 'Région de ' + tc(s.r) : 'Département de ' + tc(s.d), 'Fiche de synthèse'),
      kpisFor(c, e, m, t),
      h('div', { class: 'grid2 stack' },
        e && e.e2019 != null ? panel('Bilan 2019 → 2022', null, waterfall(e)) : panel('Bilan 2019 → 2022', null, h('div', { class: 'note' }, 'Pas de fichier 2019 de référence pour cette zone.')),
        panel('Principaux échanges d\'électeurs', lvl === 'region' ? 'Avec les autres régions (par département).' : 'Avec les autres départements.',
          h('div', { class: 'grid2' }, h('div', null, h('p', { class: 'small muted' }, 'Venus de'), flowList(inFlows, f => (lvl === 'region' ? f[1] + ' (' + tc(f[0]) + ')' : f[1]))),
            h('div', null, h('p', { class: 'small muted' }, 'Partis vers'), flowList(outFlows, f => (lvl === 'region' ? f[3] + ' (' + tc(f[2]) + ')' : f[3])))))),
      h('div', { class: 'stack' }, panel(child + 's', 'Synthèse de tous les modules. Cliquez pour ouvrir la fiche.', table({
        rows, sort: 'electeurs', exportName: 'fiche-' + (s.d || s.r),
        cols: [
          { k: 'nom', label: child, fmt: v => tc(v) },
          { k: 'electeurs', label: 'Électeurs', num: true },
          { k: 'bureaux', label: 'Bureaux', num: true },
          { k: 'lieux', label: 'Lieux', num: true },
          { k: 'moy', label: 'Élect. / bureau', num: true },
          { k: 'croiss', label: '2019 → 2022', num: true, fmt: v => spct(v), cls: v => (v > 0 ? 'up' : v < 0 ? 'down' : '') },
          { k: 'nouveaux', label: 'Nouveaux', num: true },
          { k: 'varLG', label: 'L. → LG.', num: true, fmt: v => spct(v, 2) },
          { k: 'solde', label: 'Solde transferts', num: true, fmt: v => sn(v), cls: v => (v > 0 ? 'up' : v < 0 ? 'down' : '') },
        ],
      }))),
    ];
  }

  async function fichePays(pays) {
    const c = IDX.cartePays.get(key(pays));
    if (!c) return h('div', { class: 'note warn' }, 'Pays introuvable.');
    const rows = carteChildren({ r: 'ETR', d: pays });
    return [crumbs(['Étranger', hrefWith('carte', { r: 'ETR' })], [pays]), section(tc(pays), 'Vote à l\'étranger — Législatives 2022'), kpisFor(c),
      h('div', { class: 'stack' }, panel('Villes de vote', null, table({ rows, sort: 'electeurs', cols: [{ k: 'nom', label: 'Ville', fmt: v => tc(v) }, { k: 'electeurs', label: 'Électeurs', num: true }, { k: 'bureaux', label: 'Bureaux', num: true }, { k: 'lieux', label: 'Lieux', num: true }, { k: 'moy', label: 'Élect. / bureau', num: true }] })))];
  }

  async function ficheCommune(z) {
    const data = await loadRegion(z.etr ? 'ETR' : z.r);
    const lieux = data.lieux.filter(l => key(l.region) === key(z.r) && key(l.dept) === key(z.d) && key(l.commune) === key(z.c));
    const ck = key(z.r) + '|' + key(z.d) + '|' + key(z.c);
    const c = IDX.carteCom.get((z.etr ? 'ETR|' : '') + ck);
    const e = z.etr ? null : IDX.evCom.get(ck), m = z.etr ? null : IDX.cmpCom.get(ck), t = z.etr ? null : IDX.trCom.get(ck);
    const flows = (data.transfertsCommunes || []);
    const isMe = (r, d, cc) => key(r) === key(z.r) && key(d) === key(z.d) && key(cc) === key(z.c);
    const inF = flows.filter(f => isMe(f[3], f[4], f[5]) && !isMe(f[0], f[1], f[2])).sort((a, b) => b[6] - a[6]);
    const outF = flows.filter(f => isMe(f[0], f[1], f[2]) && !isMe(f[3], f[4], f[5])).sort((a, b) => b[6] - a[6]);
    const lieuRows = lieux.map(l => ({ nom: l.nom, electeurs: l.electeurs, bureaux: l.bureaux.length, moy: ratio(l.electeurs, l.bureaux.length), eL: l.locales ? l.locales.electeurs : null, link: '#/fiche/lieu/' + (z.etr ? 'ETR' : enc(z.r)) + '/' + enc(z.d) + '/' + enc(z.c) + '/' + enc(l.nom) + (z.etr ? '?pays=' + enc(z.r) : '') }));
    const head = z.etr ? crumbs(['Étranger', hrefWith('carte', { r: 'ETR' })], [z.r, '#/fiche/pays/' + enc(z.r)], [z.c]) : crumbs(['Région de ' + z.r, '#/fiche/region/' + enc(z.r)], ['Département de ' + z.d, '#/fiche/dept/' + enc(z.r) + '/' + enc(z.d)], [z.c]);
    return [head, section('Commune de ' + tc(z.c), z.etr ? tc(z.r) : tc(z.d) + ', ' + tc(z.r)), kpisFor(c, e, m, t),
      !z.etr ? h('div', { class: 'grid2 stack' },
        e && e.e2019 != null ? panel('Bilan 2019 → 2022', null, waterfall(e)) : panel('Bilan 2019 → 2022', null, h('div', { class: 'note' }, 'Pas de données d\'évolution pour cette commune.')),
        panel('Transferts Locales → Législatives', 'Communes d\'origine et de destination des électeurs transférés.',
          h('div', { class: 'grid2' },
            h('div', null, h('p', { class: 'small muted' }, `Venus de (${n0(sum(inF, f => f[6]))})`), barList(inF.slice(0, 8).map(f => ({ label: tc(f[2]), value: f[6], href: '#/fiche/commune/' + enc(f[0]) + '/' + enc(f[1]) + '/' + enc(f[2]), tip: `<b>${tc(f[2])}</b> (${tc(f[1])})<br>${n0(f[6])} électeurs` })))),
            h('div', null, h('p', { class: 'small muted' }, `Partis vers (${n0(sum(outF, f => f[6]))})`), barList(outF.slice(0, 8).map(f => ({ label: tc(f[5]), value: f[6], href: '#/fiche/commune/' + enc(f[3]) + '/' + enc(f[4]) + '/' + enc(f[5]), tip: `<b>${tc(f[5])}</b> (${tc(f[4])})<br>${n0(f[6])} électeurs` }))))))) : null,
      h('div', { class: 'stack' }, panel('Lieux de vote', 'Cliquez sur un lieu pour voir ses bureaux.', table({
        rows: lieuRows, sort: 'electeurs', exportName: 'lieux-' + z.c,
        cols: [{ k: 'nom', label: 'Lieu de vote', fmt: v => tc(v) }, { k: 'electeurs', label: 'Électeurs LG.', num: true }, { k: 'bar', label: '', bar: 'pos', get: r => r.electeurs }, { k: 'bureaux', label: 'Bureaux', num: true }, { k: 'moy', label: 'Élect. / bureau', num: true },
          z.etr ? null : { k: 'eL', label: 'Électeurs L.', num: true }, z.etr ? null : { k: 'var', label: 'Variation', num: true, get: r => (r.eL == null ? null : r.electeurs - r.eL), fmt: v => sn(v), cls: v => (v > 0 ? 'up' : v < 0 ? 'down' : '') }].filter(Boolean),
      })))];
  }

  async function ficheLieu(z) {
    const etr = z.r === 'ETR';
    const pays = etr ? new URLSearchParams(location.hash.split('?')[1] || '').get('pays') : null;
    const data = await loadRegion(etr ? 'ETR' : z.r);
    const l = data.lieux.find(x => (etr ? key(x.region) === key(pays) : key(x.region) === key(z.r)) && key(x.dept) === key(z.d) && key(x.commune) === key(z.c) && key(x.nom) === key(z.l));
    if (!l) {
      const old = (data.centresDisparus || []).find(x => key(x.commune) === key(z.c) && key(x.nom) === key(z.l));
      return [crumbs([z.c]), h('div', { class: 'note warn' }, old ? `Ce centre n'apparaît plus dans la carte des Législatives 2022 (${n0(old.electeursL)} électeurs aux Locales).` : 'Lieu de vote introuvable dans la carte électorale 2022.')];
    }
    const communeHref = etr ? '#/fiche/commune/ETR/' + enc(pays) + '/' + enc(l.commune) : '#/fiche/commune/' + enc(l.region) + '/' + enc(l.dept) + '/' + enc(l.commune);
    const head = etr ? crumbs(['Étranger', hrefWith('carte', { r: 'ETR' })], [pays, '#/fiche/pays/' + enc(pays)], [l.commune, communeHref], [l.nom])
      : crumbs(['Région de ' + l.region, '#/fiche/region/' + enc(l.region)], ['Département de ' + l.dept, '#/fiche/dept/' + enc(l.region) + '/' + enc(l.dept)], [l.commune, communeHref], [l.nom]);
    const seuil = R.seuilPetitBureau;
    return [head, section(tc(l.nom), 'Lieu de vote — ' + tc(l.commune)),
      h('div', { class: 'kpis' }, kpi('Électeurs LG. 2022', n0(l.electeurs)), kpi('Bureaux', n0(l.bureaux.length), n0(ratio(l.electeurs, l.bureaux.length)) + ' électeurs / bureau'),
        l.locales ? kpi('Électeurs aux Locales', n0(l.locales.electeurs), sn(l.electeurs - l.locales.electeurs) + ' aux Législatives', l.electeurs >= l.locales.electeurs ? 'up' : 'down') : null,
        l.locales ? kpi('Bureaux aux Locales', n0(l.locales.bureaux), sn(l.bureaux.length - l.locales.bureaux) + ' bureaux') : null),
      h('div', { class: 'stack' }, panel('Bureaux de vote', `En orange : moins de ${seuil} électeurs.`,
        h('div', { class: 'bureaux', style: { marginBottom: '14px' } }, l.bureaux.map(b => h('span', { class: b[1] < seuil ? 'low' : null, 'data-tip': `Bureau ${b[0]} · ${n0(b[1])} électeurs${b[2] ? '<br>' + b[2] : ''}` }, 'B' + b[0] + ' · ' + n0(b[1])))),
        table({ rows: l.bureaux.map(b => ({ n: +b[0] || b[0], e: b[1], i: b[2] || '—' })), sort: 'n', dir: 1, searchable: false, pageSize: 50, exportName: 'bureaux-' + l.nom,
          cols: [{ k: 'n', label: 'N° bureau', num: true }, { k: 'e', label: 'Électeurs', num: true }, { k: 'bar', label: '', bar: 'pos', get: r => r.e }, { k: 'i', label: 'Implantation', fmt: v => tc(v) }] })))];
  }

  // ------------------------------------------------------------------ Recherche
  let SEARCH = null, searchSel = 0, lieuxLoaded = false;
  function buildSearch() {
    SEARCH = [];
    IDX.carteRegSN.forEach(r => SEARCH.push({ kind: 'Région', label: r.nom, path: n0(r.electeurs) + ' électeurs', href: '#/fiche/region/' + enc(r.nom) }));
    IDX.carteRegETR.forEach(r => SEARCH.push({ kind: 'Pays', label: r.nom, path: 'Étranger · ' + n0(r.electeurs) + ' électeurs', href: '#/fiche/pays/' + enc(r.nom) }));
    R.carte.departements.filter(d => d.zone === 'SN').forEach(d => SEARCH.push({ kind: 'Département', label: d.nom, path: tc(d.region), href: '#/fiche/dept/' + enc(d.region) + '/' + enc(d.nom) }));
    R.carte.communes.forEach(c => SEARCH.push({ kind: c.zone === 'ETR' ? 'Ville' : 'Commune', label: c.nom, path: c.zone === 'ETR' ? tc(c.region) : tc(c.dept) + ', ' + tc(c.region), href: c.zone === 'ETR' ? '#/fiche/commune/ETR/' + enc(c.region) + '/' + enc(c.nom) : '#/fiche/commune/' + enc(c.region) + '/' + enc(c.dept) + '/' + enc(c.nom) }));
    SEARCH.forEach(x => { x.k = key(x.label); });
  }
  async function loadAllLieux() {
    if (lieuxLoaded) return; lieuxLoaded = true;
    const codes = Object.keys(R.fichiersRegionaux);
    const all = await Promise.all(codes.map(c => (regionCache[c] || (regionCache[c] = fetch('data/regions/' + c + '.json').then(r => r.json())))));
    all.forEach((d, i) => d.lieux.forEach(l => {
      const etr = codes[i] === 'ETRANGER';
      SEARCH.push({ kind: 'Lieu de vote', label: l.nom, k: key(l.nom), path: tc(l.commune) + ', ' + tc(etr ? l.region : l.dept),
        href: etr ? '#/fiche/lieu/ETR/' + enc(l.dept) + '/' + enc(l.commune) + '/' + enc(l.nom) + '?pays=' + enc(l.region) : '#/fiche/lieu/' + enc(l.region) + '/' + enc(l.dept) + '/' + enc(l.commune) + '/' + enc(l.nom) });
    }));
    runSearch();
  }
  function runSearch() {
    const box = $('#search-results'), q = key($('#search-input').value);
    if (!q || !SEARCH) { box.hidden = true; return; }
    const words = q.split(' ');
    const rank = { 'Région': 0, 'Pays': 1, 'Département': 1, 'Commune': 2, 'Ville': 3, 'Lieu de vote': 4 };
    const res = SEARCH.filter(x => words.every(w => x.k.includes(w))).sort((a, b) => (b.k.startsWith(q) - a.k.startsWith(q)) || rank[a.kind] - rank[b.kind] || a.k.localeCompare(b.k)).slice(0, 30);
    searchSel = Math.min(searchSel, Math.max(0, res.length - 1));
    box.replaceChildren(...(res.length ? res.map((x, i) => h('a', { href: x.href, class: i === searchSel ? 'active' : null, onclick: closeSearch }, h('span', { class: 'kind' }, x.kind), h('span', null, tc(x.label)), h('span', { class: 'path' }, x.path)))
      : [h('div', { class: 'empty' }, lieuxLoaded ? 'Aucun résultat.' : 'Recherche dans les lieux de vote…')]));
    box.hidden = false;
  }
  function closeSearch() { $('#search-results').hidden = true; $('#search-input').value = ''; $('#search-input').blur(); }
  function initSearch() {
    const input = $('#search-input');
    input.addEventListener('focus', () => { loadAllLieux(); });
    input.addEventListener('input', () => { searchSel = 0; runSearch(); });
    input.addEventListener('keydown', e => {
      const links = [...document.querySelectorAll('#search-results a')];
      if (e.key === 'ArrowDown') { searchSel = Math.min(links.length - 1, searchSel + 1); runSearch(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { searchSel = Math.max(0, searchSel - 1); runSearch(); e.preventDefault(); }
      else if (e.key === 'Enter' && links[searchSel]) { location.hash = links[searchSel].getAttribute('href'); closeSearch(); }
      else if (e.key === 'Escape') closeSearch();
    });
    document.addEventListener('click', e => { if (!e.target.closest('#search')) $('#search-results').hidden = true; });
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); input.select(); } });
  }

  // ------------------------------------------------------------------ Infobulles
  const tipEl = () => $('#tooltip');
  function hideTip() { const t = tipEl(); if (t) t.hidden = true; }
  function initTips() {
    document.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-tip]');
      if (!el) { hideTip(); return; }
      const t = tipEl(); t.innerHTML = el.getAttribute('data-tip'); t.hidden = false;
    });
    document.addEventListener('mousemove', e => {
      const t = tipEl(); if (t.hidden) return;
      const w = t.offsetWidth, x = e.clientX + 14 + w > window.innerWidth ? e.clientX - w - 14 : e.clientX + 14;
      t.style.left = x + 'px'; t.style.top = (e.clientY + 16) + 'px';
    });
    document.addEventListener('scroll', hideTip, { passive: true });
  }

  // ------------------------------------------------------------------ Démarrage
  async function start() {
    const now = new Date();
    const hr = now.getHours();
    $('#greeting-title').textContent = hr < 18 ? 'Bonjour' : 'Bonsoir';
    $('#greeting-date').textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    initTips(); initSearch();
    try {
      await loadResume();
    } catch (err) {
      $('#view').replaceChildren(h('div', { class: 'note warn' }, h('b', null, 'Les données n\'ont pas pu être chargées. '),
        location.protocol === 'file:' ? 'Ouvrez l\'outil via un serveur web (par exemple : python3 -m http.server dans le dossier fichier-electoral), le navigateur bloquant la lecture des fichiers locaux.' : 'Détail : ' + err.message));
      $('#topbar-info').textContent = 'Données indisponibles';
      return;
    }
    const tot = R.carte.totaux.SN.electeurs + R.carte.totaux.ETR.electeurs;
    $('#topbar-info').textContent = `Carte électorale 2022 · ${NF.format(tot)} électeurs`;
    $('#footer-gen').textContent = 'Données préparées le ' + new Date(R.genere).toLocaleDateString('fr-FR');
    buildSearch();
    window.addEventListener('hashchange', route);
    route();
  }
  start();
})();
