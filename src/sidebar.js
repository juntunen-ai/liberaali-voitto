import { PARTY_COLORS, getColor } from './modes.js';

export function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
}

export function showInfo(p, electedVertaus, electedAreaVotes, libePerArea, convertTargets) {
  const aan = p.aan || 1;
  const sc = p.score;
  const scoreClr = sc >= 95 ? '#22c55e' : sc >= 94 ? '#86efac' : sc >= 92 ? '#fbbf24' : '#f87171';
  const parties = ['KOK','VIHR','SDP','VAS','PS','RKP','LIIK','LIBE','KESK','KD'];
  const maxV = Math.max(...parties.map(k => p[k] || 0), 1);

  const partyRows = parties.map(k => {
    const v = p[k] || 0, pct = (v/aan*100).toFixed(1), w = (v/maxV*100).toFixed(0);
    return `<div class="party-row">
      <span class="party-name">${k}</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${w}%;background:${PARTY_COLORS[k]||'#666'}"></div></div>
      <span class="bar-val">${pct}%</span></div>`;
  }).join('');

  const electedByParty = (electedAreaVotes && electedAreaVotes[p.nimi]) || {};
  const adjRows = parties
    .map(k => ({ k, adj: (p[k] || 0) - (electedByParty[k] || 0) }))
    .filter(x => x.adj > 0)
    .sort((a, b) => b.adj - a.adj);
  const maxAdj = Math.max(...adjRows.map(x => x.adj), 1);
  const adjPartyRows = adjRows.map(({ k, adj }) => {
    const pct = (adj/aan*100).toFixed(1), w = (adj/maxAdj*100).toFixed(0);
    return `<div class="party-row">
      <span class="party-name">${k}</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${w}%;background:${PARTY_COLORS[k]||'#666'}"></div></div>
      <span class="bar-val">${adj.toLocaleString('fi')} · ${pct}%</span></div>`;
  }).join('');

  const top5 = p.top5 || [];
  const candRows = top5.map((c, i) => {
    const clr = PARTY_COLORS[c.p] || '#666';
    const isLibe = c.p === 'LIBE';
    const vl = electedVertaus && electedVertaus[c.n];
    const electedBadge = vl ? `<span class="cand-elected">✓ valittu · ${vl.toLocaleString('fi')}</span>` : '';
    return `<tr class="${isLibe ? 'cand-libe' : ''}">
      <td class="cand-rank">${i+1}</td>
      <td class="cand-name">${c.n}<span class="cand-party" style="background:${clr}">${c.p}</span>${electedBadge}</td>
      <td class="cand-votes">${c.v}</td></tr>`;
  }).join('');

  const convertList = (convertTargets && convertTargets[p.nimi]) || [];
  const convertRows = convertList.map((c, i) => {
    const clr = PARTY_COLORS[c.p] || '#666';
    return `<tr>
      <td class="cand-rank">${i+1}</td>
      <td class="cand-name">${c.n}<span class="cand-party" style="background:${clr}">${c.p}</span></td>
      <td class="cand-votes">${c.v}</td></tr>`;
  }).join('');
  const convertSection = convertRows
    ? `<div class="section-title" style="margin-top:10px;color:#fb923c">Konversiokohteet (Oikeistopooli, viim. neljännes)</div>
       <table class="cand-table"><tbody>${convertRows}</tbody></table>`
    : '';

  const libeCandidate = libePerArea && libePerArea[p.nimi];
  const libeCandStr = libeCandidate
    ? ` · <span style="color:#F9B000;font-size:10px">${libeCandidate.n} (${libeCandidate.v})</span>`
    : '';

  document.getElementById('info-content').innerHTML = `
    <h2>${p.nimi}</h2>
    <div class="score-big" style="color:${scoreClr}">${sc != null ? sc.toFixed(1) : '–'}</div>
    <div class="score-label">konversiopistettä · max 100</div>
    <div class="stat-row"><span class="stat-label">Äänioikeutettuja</span><span class="stat-val">${(p.oik||0).toLocaleString('fi')}</span></div>
    <div class="stat-row"><span class="stat-label">Äänestäneet</span><span class="stat-val">${(p.aan||0).toLocaleString('fi')} · ${p.aanes_pct||0} %</span></div>
    <div class="stat-row"><span class="stat-label">Nukkuvat</span><span class="stat-val">${(p.nukk||0).toLocaleString('fi')} · ${p.nukk_pct||0} %</span></div>
    <div class="stat-row"><span class="stat-label">Oikeistopooli</span><span class="stat-val">${p.lib_pool||0} %</span></div>
    <div class="stat-row"><span class="stat-label">LIBE äänet</span><span class="stat-val">${p.LIBE||0} · ${p.libe_pct!=null?p.libe_pct.toFixed(2):0} %${libeCandStr}</span></div>
    <div class="section-title">Top 10 ehdokkaat</div>
    <table class="cand-table"><tbody>${candRows}</tbody></table>
    ${convertSection}
    <div class="section-title">Ääntenjakauma</div>
    ${partyRows}
    <div class="section-title" style="margin-top:10px">Konvertoitavissa (ilman valittuja)</div>
    ${adjPartyRows}`;
}

export function buildAAlueet(aAlueet, mode) {
  document.getElementById('a-alueet-panel').innerHTML = aAlueet.map((p, i) => {
    const clr = getColor(p, mode);
    return `<div class="a-alue-box" id="aa-box-${i}" style="background:${clr}"
      onclick="window.__selectAAlue(${i})">
      <div class="a-alue-label">${p.nimi}</div>
      <div class="a-alue-total">${p.total.toLocaleString('fi')} ääntä</div>
    </div>`;
  }).join('');
}

export function buildLegend(mode, legendItems, subtitles) {
  const el = document.getElementById('subtitle');
  if (el) el.textContent = subtitles[mode] || '';
  document.getElementById('legend-items').innerHTML =
    (legendItems[mode] || []).map(([l, c]) =>
      c ? `<div class="leg-row"><div class="leg-swatch" style="background:${c}"></div>${l}</div>`
        : `<div class="leg-row" style="font-style:italic;margin-top:4px">${l}</div>`
    ).join('');
}
