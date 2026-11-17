/* Jotna – espace parent (payeur) : échéances, mode de paiement, déclaration, reçus. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)).replace(/\s/g, ' ') + ' FCFA';
  const fdate = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
  const STATUS = { paye: 'Payé', partiel: 'Partiel', retard: 'En retard', avenir: 'À venir' };
  const app = $('#app'); let me = null;
  async function api(method, path, data) {
    const res = await fetch(path, { method, headers: data !== undefined ? { 'content-type': 'application/json' } : {}, body: data !== undefined ? JSON.stringify(data) : undefined, credentials: 'same-origin' });
    const body = (res.headers.get('content-type') || '').includes('json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error(body && body.error ? body.error : `Erreur ${res.status}`);
    return body;
  }
  let toastT; const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200); };
  let dlgOk = null;
  function openDialog(title, body, okLabel, onOk) { $('#dlgTitle').textContent = title; $('#dlgBody').innerHTML = body; $('#dlgOk').textContent = okLabel; dlgOk = onOk; const d = $('#dlg'); if (!d.open) d.showModal(); }
  $('#dlgCancel').addEventListener('click', () => $('#dlg').close());
  $('#dlgOk').addEventListener('click', async () => { try { if (!dlgOk || (await dlgOk()) !== false) $('#dlg').close(); } catch (e) { toast(e.message); } });
  const field = (id, label, type = 'text', value = '', extra = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value)}" ${extra}></div>`;
  const val = (id) => $('#' + id).value.trim();
  function copy(text) { const done = () => toast('Copié.'); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => toast('Sélectionnez et copiez.')); else toast('Sélectionnez et copiez.'); }
  const waSupport = (c) => { const d = String((c && c.supportWhatsapp) || '').replace(/\D/g, ''); return d ? `https://wa.me/${d.startsWith('221') ? d : '221' + d}` : ''; };

  function renderLogin(err, phone) {
    app.innerHTML = `<div class="login login-p"><div class="box">
      <div class="logo"><span class="mark">J</span>Jotna</div>
      <p class="tag">Espace parent, locataire ou adhérent : vos échéances, comment payer, vos reçus.</p>
      <form id="f">${field('phone', 'Votre numéro de téléphone', 'tel', phone || '', 'autocomplete="tel" required placeholder="77 000 00 00"')}${field('code', 'Code d\'accès à 6 chiffres', 'text', '', 'inputmode="numeric" pattern="[0-9]{6}" required placeholder="123456"')}
      <div class="err">${esc(err || '')}</div><button class="btn emph" type="submit">Ouvrir mon espace</button></form>
      <p class="muted" style="font-size:.8125rem;margin:1rem 0 0">Le code et le lien personnel vous sont envoyés par l'établissement, par WhatsApp. Sans code, demandez-le au secrétariat.</p>
    </div></div>`;
    $('#f').addEventListener('submit', async (e) => { e.preventDefault(); try { me = await api('POST', '/api/parent/login', { phone: val('phone'), code: val('code') }); render(); } catch (er) { renderLogin(er.message, val('phone')); } });
  }
  function render() {
    if (!me) return renderLogin();
    const v = me.tenant.vocab; const sup = waSupport(me.config);
    app.innerHTML = `<div class="pwrap">
      <div class="phead"><span class="mark">J</span><div><div class="t">${esc(me.tenant.name)}</div><div class="s">Espace ${esc(v.payer.toLowerCase())}${me.tenant.city ? ' · ' + esc(me.tenant.city) : ''}</div></div><span class="spacer"></span><button class="btn sm ghost" id="logout">Quitter</button></div>
      <div class="hello"><h1>Bonjour, ${esc(me.payer.nom)}</h1><div class="muted">${esc(me.monthLabel)} · échéance le ${me.tenant.dueDay} du mois</div></div>
      <div class="due ${me.due ? '' : 'ok'}"><div class="l">${me.due ? 'Reste à payer ce mois' : 'Tout est réglé ce mois'}</div><div class="v num">${fmt(me.due)}</div>${me.due ? `<div class="muted" style="font-size:.8125rem;margin-top:.25rem">Payez vers l'alias PI-SPI ci-dessous, puis déclarez votre paiement pour accélérer la confirmation.</div>` : ''}</div>
      ${me.contracts.map((k) => `<div class="ctr"><div class="hd"><div><div class="n">${esc(k.label)}</div><div class="g">${esc(k.group || '')} · RÉF. ${esc(k.ref)}</div></div><div class="right"><div class="amt num">${fmt(k.amount)}</div><div><span class="st ${k.current.status}">${STATUS[k.current.status]}</span></div></div></div>
        ${k.rest > 0 ? `<div class="pay"><h3>Comment payer ${fmt(k.rest)}</h3><div class="kvs">
          <div class="kv2"><span class="l">Alias PI-SPI</span><span class="v">${esc(me.tenant.alias)}</span><button class="btn sm" data-copy="${esc(me.tenant.alias)}">Copier</button></div>
          <div class="kv2"><span class="l">Libellé</span><span class="v">${esc(k.ref)}</span><button class="btn sm" data-copy="${esc(k.ref)}">Copier</button></div>
          <div class="kv2"><span class="l">Montant</span><span class="v">${fmt(k.rest)}</span><button class="btn sm" data-copy="${k.rest}">Copier</button></div></div>
          <p class="how">Depuis Wave, Orange Money ou votre banque : choisissez « payer vers un alias PI-SPI » ou scannez le QR de l'établissement, saisissez l'alias, le montant, et la référence <b>${esc(k.ref)}</b> dans le libellé. Le paiement est reconnu automatiquement.</p>
          <div class="acts"><button class="btn emph sm" data-declare="${k.id}">J'ai payé, je le déclare</button>${me.tenant.phone ? `<a class="btn sm" href="https://wa.me/221${esc(String(me.tenant.phone).replace(/\\D/g, '').replace(/^221/, ''))}?text=${encodeURIComponent(`Bonjour, je suis ${me.payer.nom}, au sujet de ${k.label} (réf. ${k.ref}).`)}" target="_blank" rel="noopener">Écrire à l'établissement</a>` : ''}</div></div>` : ''}
        <div class="months"><div class="scroll"><table><thead><tr><th>Mois</th><th>Échéance</th><th class="r">Attendu</th><th class="r">Reçu</th><th>Statut</th></tr></thead><tbody>${k.months.map((h) => `<tr><td>${esc(h.monthLabel)}</td><td class="num">${fdate(h.due)}</td><td class="r num">${fmt(h.amount)}</td><td class="r num">${h.paid ? fmt(h.paid) : '—'}</td><td><span class="st ${h.status}">${STATUS[h.status]}</span></td></tr>`).join('')}</tbody></table></div></div></div>`).join('') || '<div class="empty">Aucun contrat actif. Contactez l\'établissement.</div>'}
      ${me.pending.length ? `<div class="pending"><h2>Paiements déclarés, en attente de confirmation</h2>${me.pending.map((p) => `<div class="pend">${fdate(p.date)} · ${fmt(p.amount)} · ${esc(p.channel)} · ${esc(p.contract || '')} · réf. ${esc(p.ref)} — l'établissement confirme dès réception sur son relevé.</div>`).join('')}</div>` : ''}
      <div class="hist"><h2>Vos paiements et reçus</h2><div class="tbl-wrap" style="margin-top:0"><div class="scroll"><table style="min-width:0"><thead><tr><th>Date</th><th class="r">Montant</th><th>Canal</th><th>Pour</th><th>Reçu</th></tr></thead><tbody>${me.payments.map((p) => `<tr><td class="num">${fdate(p.date)}</td><td class="r num">${fmt(p.amount)}</td><td>${esc(p.channel)}</td><td>${esc(p.contract || '')}<div class="sub">${esc(p.monthLabel)}</div></td><td><a class="btn sm" href="${p.receipt}" target="_blank" rel="noopener">Reçu</a></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Aucun paiement enregistré.</td></tr>'}</tbody></table></div></div></div>
      <div class="foot-p"><span>Jotna · « jot na », c'est l'heure</span>${sup ? `<a href="${esc(sup)}" target="_blank" rel="noopener">Support WhatsApp</a>` : ''}</div>
    </div>`;
    $('#logout').addEventListener('click', async () => { await api('DELETE', '/api/parent/session'); me = null; location.hash = ''; render(); });
    app.addEventListener('click', async (e) => {
      const c = e.target.closest('[data-copy]'); if (c) return copy(c.dataset.copy);
      const d = e.target.closest('[data-declare]'); if (!d) return;
      const k = me.contracts.find((x) => x.id === d.dataset.declare);
      openDialog('Déclarer un paiement', `<div class="muted" style="font-size:.8125rem">Indiquez ce que vous avez payé pour ${esc(k.label)}. L'établissement confirme dès que le paiement apparaît sur son relevé.</div>${field('dAmount', 'Montant payé (FCFA)', 'number', k.rest, 'min="1" step="500"')}<div class="field"><label for="dChan">Canal</label><select id="dChan"><option>Wave</option><option>Orange Money</option><option>Alias PI-SPI</option><option>Virement</option><option>Espèces</option></select></div>${field('dRef', 'Référence de la transaction (visible dans votre application)', 'text', '')}${field('dDate', 'Date', 'date', new Date().toISOString().slice(0, 10))}`, 'Déclarer', async () => {
        const amount = Number(val('dAmount')); if (!amount) { toast('Indiquez le montant.'); return false; }
        await api('POST', '/api/parent/declare', { contractId: k.id, month: me.month, amount, channel: val('dChan'), ref: val('dRef'), date: val('dDate') });
        me = await api('GET', '/api/parent/me'); toast('Déclaration transmise à l\'établissement.'); render();
      });
    });
  }
  (async () => {
    const t = (location.hash.match(/t=([\w.-]+)/) || [])[1];
    try { if (t) { me = await api('POST', '/api/parent/token', { token: t }); history.replaceState(null, '', location.pathname); } else me = await api('GET', '/api/parent/me'); } catch (e) { me = null; if (t) { render(); return renderLogin(e.message); } }
    render();
  })();
})();
