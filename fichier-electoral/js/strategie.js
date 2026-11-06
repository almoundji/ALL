/* Onglet « Stratégie électorale » : historique des scrutins, rapport de force par département,
   simulateur de sièges (législatives : 112 sièges majoritaires + 53 à la proportionnelle),
   priorités de mobilisation et cadre réglementaire. Données : data/strategie.json. */
(function () {
  'use strict';
  let S = null, loading = null;
  const state = { famille: null, base: null, swing: {}, scission: {}, ecart: 10 };

  const load = () => loading || (loading = fetch('data/strategie.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(d => { S = prepare(d); return S; }));

  // ------------------------------------------------------------------ Préparation
  function prepare(d) {
    const { key } = window.EF;
    d.elections.forEach(e => {
      const zones = [e.national, e.diaspora, ...Object.values(e.diasporaZones || {}), ...Object.values(e.depts), ...Object.values(e.regions || {})].filter(Boolean);
      zones.forEach(z => { z.exp = z.exprimes || z.exprimes_calc || Object.values(z.voix).reduce((a, b) => a + b, 0); });
      e.hasDepts = Object.values(e.depts).filter(z => Object.keys(z.voix).length >= 2).length >= 30;
      e.listes = e.national ? Object.entries(e.national.voix).sort((a, b) => b[1] - a[1]).map(x => x[0]) : [];
    });
    d.siegesDep = new Map(d.sieges.filter(s => s.type === 'departement').map(s => [s.key, s]));
    d.siegesDia = d.sieges.filter(s => s.type === 'diaspora');
    d.siegesNat = (d.sieges.find(s => s.type === 'national') || { sieges: 53 }).sieges;
    d.totalSieges = d.sieges.reduce((a, s) => a + (s.sieges || 0), 0);
    d.majorite = Math.floor(d.totalSieges / 2) + 1;
    d.inscrits2024 = new Map((d.inscrits2024 || []).map(x => [x.niveau + '|' + x.key, x]));
    // Familles : regroupement des listes / candidats d'un même courant d'un scrutin à l'autre
    d.familles = (d.familles || []).filter(f => f.id);
    void key;
    return d;
  }
  const famLabel = f => f.label || f.id;
  // Voix d'une famille dans une zone : somme des listes rattachées pour ce scrutin
  function famVoix(e, f, z) {
    const membres = (f.membres && f.membres[e.id]) || [];
    return membres.reduce((a, m) => a + (z.voix[m] || 0), 0);
  }
  const aMembres = (f, e) => f.membres && (f.membres[e.id] || []).some(m => e.national && e.national.voix[m] != null);
  // Familles présentes dans ce scrutin, y compris celles issues d'une scission postérieure (part réglable)
  function famillesDe(e) {
    const direct = S.familles.filter(f => aMembres(f, e));
    const issues = S.familles.filter(f => f.scissionDe && !aMembres(f, e) && direct.some(d => d.id === f.scissionDe));
    return [...direct, ...issues];
  }
  const partScission = f => (state.scission[f.id] != null ? state.scission[f.id] : f.partDefaut || 0);

  // ------------------------------------------------------------------ Calculs
  function partsZone(e, z, fams) {
    const exp = z.exp || 1, parts = {};
    let rattache = 0;
    fams.forEach(f => { const v = famVoix(e, f, z); parts[f.id] = v / exp; rattache += v; });
    parts.AUTRES = Math.max(0, (exp - rattache) / exp);
    fams.filter(f => f.scissionDe && !aMembres(f, e)).forEach(f => {
      const t = partScission(f), p = parts[f.scissionDe] || 0;
      parts[f.id] = p * t; parts[f.scissionDe] = p * (1 - t);
    });
    return parts;
  }
  function applySwing(parts, swing) {
    const p = {};
    let tot = 0;
    for (const k in parts) { p[k] = Math.max(0, parts[k] + (swing[k] || 0) / 100); tot += p[k]; }
    for (const k in p) p[k] = tot ? p[k] / tot : 0;
    return p;
  }
  const leader = p => Object.entries(p).filter(([k]) => k !== 'AUTRES').sort((a, b) => b[1] - a[1]);

  // Répartition proportionnelle : quotient national puis plus forts restes (art. L.153)
  function proportionnelle(voixParListe, n) {
    const tot = Object.values(voixParListe).reduce((a, b) => a + b, 0);
    if (!tot) return {};
    const q = tot / n, res = {};
    let attrib = 0;
    const restes = [];
    for (const [k, v] of Object.entries(voixParListe)) { const s = Math.floor(v / q); res[k] = s; attrib += s; restes.push([k, v - s * q]); }
    restes.sort((a, b) => b[1] - a[1]);
    for (let i = 0; attrib < n && i < restes.length; i++, attrib++) res[restes[i][0]]++;
    return res;
  }

  function simulate(e, fams, swing) {
    const seats = {}; fams.forEach(f => { seats[f.id] = { maj: 0, prop: 0, depts: [] }; });
    const rows = [];
    for (const [k, z] of Object.entries(e.depts)) {
      const s = S.siegesDep.get(k);
      if (!s || !z.exp) continue;
      const base = partsZone(e, z, fams), p = applySwing(base, swing);
      const lb = leader(base), lp = leader(p);
      const win = lp[0] && lp[0][1] > 0 ? lp[0][0] : null;
      if (win && seats[win]) { seats[win].maj += s.sieges; seats[win].depts.push(k); }
      rows.push({ key: k, nom: z.nom || s.nom, region: z.region || s.region, sieges: s.sieges, base, p, gagnantBase: lb[0] && lb[0][0], gagnant: win, marge: lp[0] && lp[1] ? lp[0][1] - lp[1][1] : null, inscrits: z.inscrits, votants: z.votants, exp: z.exp });
    }
    // Diaspora : résultats par département de l'extérieur si disponibles, sinon parts de l'ensemble de la diaspora
    let diaspora = null;
    const zonesDia = Object.entries(e.diasporaZones || {}).filter(([, z]) => z.exp && Object.keys(z.voix).length > 1);
    if (zonesDia.length) {
      for (const [k, z] of zonesDia) {
        const s = S.siegesDia.find(x => x.key === k);
        if (!s) continue;
        const base = partsZone(e, z, fams), p = applySwing(base, swing), lb = leader(base), lp = leader(p);
        const win = lp[0] && lp[0][0];
        if (win && seats[win]) { seats[win].maj += s.sieges; seats[win].depts.push(k); }
        rows.push({ key: k, nom: s.nom, region: 'Diaspora', diaspora: true, sieges: s.sieges, base, p, gagnantBase: lb[0] && lb[0][0], gagnant: win, marge: lp[0] && lp[1] ? lp[0][1] - lp[1][1] : null, inscrits: z.inscrits, votants: z.votants, exp: z.exp });
      }
    } else if (e.diaspora && e.diaspora.exp) {
      const p = applySwing(partsZone(e, e.diaspora, fams), swing), lp = leader(p);
      const n = S.siegesDia.reduce((a, s) => a + s.sieges, 0);
      if (lp[0] && seats[lp[0][0]]) seats[lp[0][0]].maj += n;
      diaspora = { gagnant: lp[0] && lp[0][0], sieges: n, p };
    }
    // Proportionnelle (art. L.153) : quotient = exprimés / 53, puis plus forts restes.
    // Les voix non rattachées sont réparties entre autant de listes fictives qu'il y avait de listes non rattachées.
    let prop = {};
    if (e.national && e.national.exp) {
      const pn = applySwing(partsZone(e, e.national, fams), swing), exp = e.national.exp;
      const rattachees = new Set(fams.flatMap(f => (f.membres && f.membres[e.id]) || []));
      const nAutres = Math.max(1, Object.keys(e.national.voix).filter(m => !rattachees.has(m)).length);
      const voix = {};
      fams.forEach(f => { voix[f.id] = pn[f.id] * exp; });
      for (let i = 0; i < nAutres; i++) voix['AUTRES#' + i] = (pn.AUTRES || 0) * exp / nAutres;
      const r = proportionnelle(voix, S.siegesNat);
      fams.forEach(f => { seats[f.id].prop = r[f.id] || 0; prop[f.id] = r[f.id] || 0; });
      prop.AUTRES = Object.entries(r).filter(([k]) => k.startsWith('AUTRES#')).reduce((a2, [, v]) => a2 + v, 0);
    }
    return { seats, rows, diaspora, prop };
  }

  function categorie(marge, enTete) {
    const m = marge * 100, ecart = state.ecart;
    if (enTete) return m >= 20 ? 'Bastion' : m >= ecart ? 'Favorable' : 'Pivot (en tête)';
    return m <= ecart ? 'Pivot (à reprendre)' : m <= 25 ? 'À conquérir' : 'Difficile';
  }
  const CAT_CLS = { 'Bastion': 'ok', 'Favorable': 'ok', 'Pivot (en tête)': 'attention', 'Pivot (à reprendre)': 'attention', 'À conquérir': 'info', 'Difficile': 'critique' };

  // ------------------------------------------------------------------ Rendu
  async function page(_s, rest) {
    const E = window.EF, { h } = E;
    try { await load(); } catch (err) { return h('div', { class: 'note warn' }, 'Données de stratégie indisponibles : ' + err.message); }
    const sub = rest[0] || 'synthese';
    const nav = h('div', { class: 'tabs', style: { marginTop: '0', fontSize: '14px' } },
      [['synthese', 'Rapport de force'], ['simulateur', 'Simulateur de sièges'], ['priorites', 'Priorités de mobilisation'], ['historique', 'Historique des scrutins'], ['cadre', 'Cadre réglementaire & calendrier']]
        .map(([id, lab]) => h('a', { href: '#/strategie/' + id, class: sub === id ? 'active' : null }, lab)));
    const avert = h('div', { class: 'note', style: { marginBottom: '14px' } },
      'Outil d\'aide à l\'analyse, utilisable pour tout parti ou coalition. Les simulations reposent sur des résultats passés agrégés par département et sur une hypothèse de report uniforme : ce ne sont pas des prévisions.');
    if (sub === 'cadre') return [E.section('Stratégie électorale', 'Cadre réglementaire et calendrier'), nav, pageCadre()];
    const withDepts = S.elections.filter(e => e.hasDepts);
    if (!S.familles.length || !withDepts.length) {
      return [E.section('Stratégie électorale'), nav, avert, h('div', { class: 'note warn' }, 'Les résultats électoraux détaillés par département ne sont pas encore intégrés. ', h('a', { href: '#/strategie/cadre' }, 'Voir le cadre réglementaire et le calendrier →')),
        sub === 'historique' ? pageHistorique() : null];
    }
    if (!state.base || !withDepts.find(e => e.id === state.base)) state.base = withDepts[withDepts.length - 1].id;
    const e = S.elections.find(x => x.id === state.base);
    const fams = famillesDe(e);
    if (!state.famille || !S.familles.find(f => f.id === state.famille)) state.famille = fams[0] ? fams[0].id : S.familles[0].id;
    const ctrl = h('div', { class: 'filters' },
      h('label', { for: 'st-fam' }, 'Parti / coalition'),
      h('select', { id: 'st-fam', onchange: ev => { state.famille = ev.target.value; E.rerender(); } }, S.familles.map(f => h('option', { value: f.id, selected: f.id === state.famille }, famLabel(f)))),
      h('label', { for: 'st-base' }, 'Scrutin de référence'),
      h('select', { id: 'st-base', onchange: ev => { state.base = ev.target.value; state.swing = {}; E.rerender(); } }, withDepts.map(x => h('option', { value: x.id, selected: x.id === state.base }, x.label))));
    const body = sub === 'simulateur' ? pageSimulateur(e, fams) : sub === 'priorites' ? pagePriorites(e, fams) : sub === 'historique' ? pageHistorique() : pageSynthese(e, fams);
    return [E.section('Stratégie électorale', S.familles.find(f => f.id === state.famille) ? famLabel(S.familles.find(f => f.id === state.famille)) : ''), nav, avert, sub === 'historique' ? null : ctrl, body];
  }

  function analyse(e, fams) {
    const sim = simulate(e, fams, {});
    const F = state.famille;
    return sim.rows.map(r => {
      const lb = leader(r.base), me = r.base[F] || 0;
      const enTete = lb[0] && lb[0][0] === F;
      const adv = enTete ? lb[1] : lb[0];
      const marge = me - (adv ? adv[1] : 0);
      const voixMe = me * r.exp, voixAdv = (adv ? adv[1] : 0) * r.exp;
      const abst = r.inscrits && r.votants ? r.inscrits - r.votants : null;
      const fichier = window.EF.IDX.evDep ? [...window.EF.IDX.evDep.values()].find(x => window.EF.key(x.nom) === r.key) : null;
      const tr = window.EF.IDX.trDep ? window.EF.IDX.trDep.get(r.key) : null;
      return {
        ...r, me, enTete, adv: adv ? adv[0] : null, marge, cat: categorie(Math.abs(marge), enTete),
        voixManquantes: enTete ? 0 : Math.ceil(voixAdv - voixMe) + 1,
        persuasion: enTete ? 0 : Math.ceil((voixAdv - voixMe) / 2) + 1,
        abst, participation: r.inscrits && r.votants ? r.votants / r.inscrits : null,
        nouveaux: fichier ? fichier.nouveaux : null, soldeTransferts: tr ? tr.solde : null,
        // Indice de priorité : sièges en jeu pondérés par la proximité du basculement
        priorite: r.sieges * Math.max(0, 1 - Math.abs(marge) * 100 / 30),
      };
    });
  }

  function pageSynthese(e, fams) {
    const E = window.EF, { h } = E;
    const F = state.famille, fam = S.familles.find(f => f.id === F);
    const rows = analyse(e, fams);
    const nat = e.national ? partsZone(e, e.national, fams) : {};
    const gagnes = rows.filter(r => r.enTete), siegesGagnes = E.sum(gagnes, r => r.sieges);
    const pivots = rows.filter(r => r.cat.startsWith('Pivot'));
    const counts = {}; rows.forEach(r => { counts[r.cat] = (counts[r.cat] || 0) + 1; });
    return [
      E.tiles([
        { title: 'Score national', sub: e.label, icon: 'users', value: E.pct(nat[F]), caption: E.n0((nat[F] || 0) * (e.national ? e.national.exp : 0)) + ' voix' },
        { title: 'Départements en tête', sub: 'Sur ' + rows.length + ' départements', icon: 'pin', value: E.n0(gagnes.length), caption: siegesGagnes + ' sièges majoritaires', cls: 'up' },
        { title: 'Départements pivots', sub: `Écart inférieur à ${state.ecart} points`, icon: 'swap', value: E.n0(pivots.length), caption: E.sum(pivots, r => r.sieges) + ' sièges en jeu', cls: 'warn', href: '#/strategie/priorites' },
        { title: 'Bastions', sub: 'Avance ≥ 20 points', icon: 'check', value: E.n0(counts['Bastion'] || 0), caption: 'départements' },
        { title: 'Simulateur', sub: 'Sièges selon les règles L.151 / L.153', icon: 'grid', value: S.totalSieges, caption: 'sièges · majorité ' + S.majorite, href: '#/strategie/simulateur' },
      ]),
      h('div', { class: 'grid2 stack' },
        E.panel('Répartition des départements', 'Selon l\'écart avec le premier adversaire (ou avec le vainqueur).', E.barList(['Bastion', 'Favorable', 'Pivot (en tête)', 'Pivot (à reprendre)', 'À conquérir', 'Difficile'].map(c => ({ label: c, value: counts[c] || 0 })))),
        E.panel('Meilleurs scores', 'Départements où ' + famLabel(fam) + ' obtient ses meilleurs résultats.', E.barList([...rows].sort((a, b) => b.me - a.me).slice(0, 10).map(r => ({ label: E.tc(r.nom), value: r.me * 100 })), v => E.pct(v / 100)))),
      h('div', { class: 'stack' }, E.panel('Rapport de force par département', 'Scrutin de référence : ' + e.label + '. Marge = score − score du principal adversaire (en points).', E.table({
        rows, sort: 'sieges', exportName: 'rapport-de-force-' + F + '-' + e.id,
        cols: [
          { k: 'nom', label: 'Circonscription', fmt: v => E.tc(v) },
          { k: 'region', label: 'Région', fmt: v => E.tc(v) },
          { k: 'sieges', label: 'Sièges', num: true },
          { k: 'me', label: 'Score', num: true, fmt: v => E.pct(v) },
          { k: 'adv', label: 'Principal adversaire', get: r => advLabel(r.adv) },
          { k: 'marge', label: 'Marge', num: true, fmt: v => E.spct(v), cls: v => (v > 0 ? 'up' : 'down') },
          { k: 'mbar', label: '', bar: 'div', get: r => r.marge, fmt: v => E.spct(v) },
          { k: 'cat', label: 'Catégorie', fmt: v => h('span', { class: 'badge ' + CAT_CLS[v] }, v) },
          { k: 'participation', label: 'Participation', num: true, fmt: v => E.pct(v) },
        ],
      }))),
    ];
  }
  const advLabel = id => { if (!id) return '—'; const f = S.familles.find(x => x.id === id); return f ? famLabel(f) : id === 'AUTRES' ? 'Autres listes' : id; };

  function pageSimulateur(e, fams) {
    const E = window.EF, { h } = E;
    const sim = simulate(e, fams, state.swing);
    const base = simulate(e, fams, {});
    const nat = e.national ? partsZone(e, e.national, fams) : {};
    const out = h('div');
    const sliders = h('div', { class: 'panel' }, h('h3', null, 'Hypothèses de report'), h('div', { class: 'sub' }, 'Variation du score de chaque famille (en points), appliquée uniformément à tous les départements, puis renormalisée.'),
      fams.map(f => h('div', { class: 'bars' }, h('div', { class: 'row', style: { gridTemplateColumns: 'minmax(140px,260px) 1fr 120px' } },
        h('span', { class: 'lbl' }, famLabel(f)),
        h('input', { type: 'range', min: -20, max: 20, step: 0.5, value: state.swing[f.id] || 0, 'aria-label': 'Variation ' + famLabel(f), onchange: ev => { state.swing[f.id] = +ev.target.value; E.rerender(); } }),
        h('span', { class: 'val' }, E.pct(nat[f.id]) + ' ' + (state.swing[f.id] ? (state.swing[f.id] > 0 ? '+' : '') + state.swing[f.id] + ' pt' : ''))))),
      fams.filter(f => f.scissionDe && !aMembres(f, e)).map(f => h('div', { class: 'bars', style: { marginTop: '8px' } }, h('div', { class: 'row', style: { gridTemplateColumns: 'minmax(140px,260px) 1fr 120px' }, 'data-tip': f.note || '' },
        h('span', { class: 'lbl' }, 'Scission ' + famLabel(S.familles.find(x => x.id === f.scissionDe)).split(' (')[0] + ' → ' + famLabel(f).split(' (')[0] + ' : part captée'),
        h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(partScission(f) * 100), 'aria-label': 'Part captée par ' + famLabel(f), onchange: ev => { state.scission[f.id] = ev.target.value / 100; E.rerender(); } }),
        h('span', { class: 'val' }, Math.round(partScission(f) * 100) + ' %')))),
      h('div', { style: { marginTop: '10px' } }, h('button', { class: 'btn', onclick: () => { state.swing = {}; state.scission = {}; E.rerender(); } }, 'Réinitialiser')));
    const res = fams.map(f => ({ f, maj: sim.seats[f.id].maj, prop: sim.seats[f.id].prop, tot: sim.seats[f.id].maj + sim.seats[f.id].prop, base: base.seats[f.id].maj + base.seats[f.id].prop })).sort((a, b) => b.tot - a.tot);
    const autres = S.totalSieges - E.sum(res, r => r.tot);
    const bascules = sim.rows.filter(r => r.gagnant !== r.gagnantBase);
    out.append(
      h('div', { class: 'grid2' }, sliders,
        E.panel('Assemblée simulée', `${S.totalSieges} sièges — majorité absolue : ${S.majorite}.`,
          E.barList([...res.map(r => ({ label: famLabel(r.f), value: r.tot, tip: `<b>${famLabel(r.f)}</b><br>${r.tot} sièges (${r.maj} majoritaires + ${r.prop} proportionnels)<br>Référence : ${r.base}` })), autres > 0 ? { label: 'Autres listes', value: autres } : null].filter(Boolean), v => v + ' sièges'),
          h('p', { class: 'small muted' }, res[0] && res[0].tot >= S.majorite ? `${famLabel(res[0].f)} obtiendrait la majorité absolue (${res[0].tot} sièges).` : 'Aucune famille n\'atteindrait la majorité absolue.'))),
      h('div', { class: 'stack' }, E.panel('Détail des sièges', 'Majoritaire : la liste en tête dans un département gagne tous ses sièges. Proportionnelle : quotient national et plus forts restes sur ' + S.siegesNat + ' sièges.', E.table({
        rows: res.map(r => ({ nom: famLabel(r.f), maj: r.maj, prop: r.prop, tot: r.tot, delta: r.tot - r.base })), searchable: false, sort: 'tot',
        cols: [{ k: 'nom', label: 'Famille' }, { k: 'maj', label: 'Majoritaires', num: true }, { k: 'prop', label: 'Proportionnels', num: true }, { k: 'tot', label: 'Total', num: true }, { k: 'delta', label: 'Écart / référence', num: true, fmt: v => E.sn(v), cls: v => (v > 0 ? 'up' : v < 0 ? 'down' : '') }],
      }))),
      h('div', { class: 'stack' }, E.panel('Départements qui basculent', bascules.length ? 'Par rapport au scrutin de référence.' : 'Aucun basculement avec ces hypothèses.', bascules.length ? E.table({
        rows: bascules, searchable: false, sort: 'sieges',
        cols: [{ k: 'nom', label: 'Département', fmt: v => E.tc(v) }, { k: 'sieges', label: 'Sièges', num: true }, { k: 'gagnantBase', label: 'Avant', get: r => advLabel(r.gagnantBase) }, { k: 'gagnant', label: 'Après', get: r => advLabel(r.gagnant) }, { k: 'marge', label: 'Marge simulée', num: true, fmt: v => E.pct(v) }],
      }) : null)),
      h('div', { class: 'note stack' }, 'Limites : report uniforme ; les scissions (Kiiraay, Jàmm ak Njariñ) sont modélisées comme une part fixe du score de la famille d\'origine, identique partout ; les listes non rattachées sont dispersées et ne gagnent ici aucune circonscription ; un scrutin présidentiel sert d\'approximation du comportement aux législatives.'));
    return out;
  }

  function pagePriorites(e, fams) {
    const E = window.EF, { h } = E;
    const rows = analyse(e, fams).filter(r => r.priorite > 0).sort((a, b) => b.priorite - a.priorite);
    const conquete = rows.filter(r => !r.enTete), defense = rows.filter(r => r.enTete);
    const cols = (conq) => [
      { k: 'nom', label: 'Département', fmt: v => E.tc(v) },
      { k: 'sieges', label: 'Sièges', num: true },
      { k: 'marge', label: 'Marge', num: true, fmt: v => E.spct(v), cls: v => (v > 0 ? 'up' : 'down') },
      conq ? { k: 'persuasion', label: 'Voix à convaincre', num: true, title: 'Électeurs à faire passer de l\'adversaire à soi pour égaliser' } : { k: 'avance', label: 'Avance (voix)', num: true, get: r => Math.round(r.marge * r.exp) },
      conq ? { k: 'voixManquantes', label: 'ou abstentionnistes à mobiliser', num: true } : null,
      { k: 'abst', label: 'Abstentionnistes', num: true },
      { k: 'ratio', label: conq ? 'Effort / abstention' : 'Avance / abstention', num: true, get: r => (r.abst ? (conq ? r.voixManquantes : r.marge * r.exp) / r.abst : null), fmt: v => E.pct(v) },
      { k: 'nouveaux', label: 'Nouveaux inscrits 2019-22', num: true },
      { k: 'soldeTransferts', label: 'Solde transferts 2022', num: true, fmt: v => E.sn(v) },
    ].filter(Boolean);
    return [
      h('div', { class: 'grid2 stack' },
        E.panel('À conquérir en priorité', 'Départements où la famille est derrière mais à portée (indice = sièges × proximité du basculement).', E.barList(conquete.slice(0, 10).map(r => ({ label: E.tc(r.nom) + ' (' + r.sieges + ')', value: r.priorite, tip: `<b>${E.tc(r.nom)}</b><br>${r.sieges} sièges · retard ${E.spct(r.marge)}<br>${E.n0(r.persuasion)} voix à convaincre` })), v => v.toFixed(1))),
        E.panel('À défendre', 'Départements gagnés de justesse.', E.barList(defense.slice(0, 10).map(r => ({ label: E.tc(r.nom) + ' (' + r.sieges + ')', value: r.priorite, tip: `<b>${E.tc(r.nom)}</b><br>${r.sieges} sièges · avance ${E.spct(r.marge)}` })), v => v.toFixed(1)))),
      h('div', { class: 'stack' }, E.panel('Objectifs de conquête', 'Effort / abstention : part des abstentionnistes à convaincre de voter pour combler l\'écart. Données du fichier (nouveaux inscrits, transferts) en complément.', E.table({ rows: conquete, sort: 'priorite', exportName: 'priorites-conquete-' + state.famille, cols: cols(true) }))),
      h('div', { class: 'stack' }, E.panel('Départements à défendre', null, E.table({ rows: defense, sort: 'priorite', exportName: 'priorites-defense-' + state.famille, cols: cols(false) }))),
      h('div', { class: 'note stack' }, 'Les objectifs sont des ordres de grandeur agrégés par département ; ils servent à répartir l\'effort de campagne (présence, mobilisation, inscription sur les listes) et non à cibler des personnes.'),
    ];
  }

  function pageHistorique() {
    const E = window.EF, { h } = E;
    const rows = [];
    S.elections.filter(e => e.national).forEach(e => {
      const exp = e.national.exp || 1;
      Object.entries(e.national.voix).sort((a, b) => b[1] - a[1]).forEach(([nom, v], i) => {
        const fam = S.familles.find(f => (f.membres && f.membres[e.id] || []).includes(nom));
        rows.push({ scrutin: e.label, date: e.date, rang: i + 1, nom, famille: fam ? famLabel(fam) : '—', voix: v, part: v / exp, sieges: e.national.sieges[nom] ?? null });
      });
    });
    const parts = S.elections.filter(e => e.national).map(e => {
      const exp = e.national.exp || 1, ins = e.national.inscrits;
      return { scrutin: e.label, inscrits: ins, votants: e.national.votants, participation: ins && e.national.votants ? e.national.votants / ins : null, exprimes: e.national.exp, listes: Object.keys(e.national.voix).length, depts: Object.keys(e.depts).length, diaspora: !!e.diaspora };
    });
    const fam = S.familles.find(f => f.id === state.famille);
    const trajectoire = fam ? S.elections.filter(e => e.national).map(e => ({ label: e.label, value: famVoix(e, fam, e.national) / (e.national.exp || 1) * 100 })).filter(x => x.value > 0) : [];
    return [
      fam && trajectoire.length ? h('div', { class: 'stack' }, E.panel('Trajectoire : ' + famLabel(fam), 'Score national (part des suffrages exprimés) à chaque scrutin.', E.barList(trajectoire, v => E.pct(v / 100)))) : null,
      h('div', { class: 'stack' }, E.panel('Participation', null, E.table({ rows: parts, searchable: false, cols: [{ k: 'scrutin', label: 'Scrutin' }, { k: 'inscrits', label: 'Inscrits', num: true }, { k: 'votants', label: 'Votants', num: true }, { k: 'participation', label: 'Participation', num: true, fmt: v => E.pct(v) }, { k: 'exprimes', label: 'Exprimés', num: true }, { k: 'listes', label: 'Listes / candidats', num: true }, { k: 'depts', label: 'Départements détaillés', num: true }] }))),
      h('div', { class: 'stack' }, E.panel('Résultats nationaux', 'Toutes les listes et candidats, par scrutin.', E.table({ rows, sort: null, pageSize: 40, exportName: 'resultats-nationaux', cols: [{ k: 'scrutin', label: 'Scrutin' }, { k: 'rang', label: 'Rang', num: true }, { k: 'nom', label: 'Liste / candidat' }, { k: 'famille', label: 'Famille' }, { k: 'voix', label: 'Voix', num: true }, { k: 'part', label: 'Part', num: true, fmt: v => E.pct(v, 2) }, { k: 'sieges', label: 'Sièges', num: true }] }))),
      S.sources && S.sources.length ? h('div', { class: 'stack' }, E.panel('Sources des résultats', null, h('ul', null, S.sources.map(s => h('li', null, s.label + ' — ', h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.url)))))) : null,
    ];
  }

  function pageCadre() {
    const E = window.EF, { h } = E;
    const cal = S.calendrier.map(c => ({ ...c }));
    const seats = S.sieges.map(s => ({ ...s }));
    const md = h('div', { class: 'md' });
    md.innerHTML = window.marked ? window.marked.parse(S.cadreJuridique) : '<pre>' + S.cadreJuridique.replace(/</g, '&lt;') + '</pre>';
    md.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
    return [
      h('div', { class: 'stack' }, E.panel('Calendrier électoral', 'État au 6 novembre 2026, d\'après les textes et la presse.', E.table({ rows: cal, searchable: false, cols: [{ k: 'date', label: 'Date' }, { k: 'election', label: 'Scrutin' }, { k: 'statut', label: 'Statut' }] }))),
      h('div', { class: 'stack' }, E.panel('Sièges de députés par circonscription', `Décret n° 2024-1982 du 13 septembre 2024 : ${S.totalSieges} sièges, majorité absolue à ${S.majorite}.`, E.table({ rows: seats, sort: 'sieges', pageSize: 60, exportName: 'sieges-legislatives', cols: [{ k: 'nom', label: 'Circonscription' }, { k: 'type', label: 'Type' }, { k: 'region', label: 'Région / zone' }, { k: 'sieges', label: 'Sièges', num: true }, { k: 'bar', label: '', bar: 'pos', get: r => r.sieges }] }))),
      h('div', { class: 'stack' }, h('div', { class: 'panel' }, md)),
    ];
  }

  window.Strategie = { page };
})();
