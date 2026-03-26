import { PARTY_COLORS, scoreAll, RANK_LABELS } from './modes.js';

function getRankValue(p, mode) {
  if (mode === 'score')  return p.score || 0;
  if (mode === 'pool')   return p.lib_pool || 0;
  if (mode === 'nukk')   return p.nukk_pct || 0;
  if (mode === 'libe')   return p.libe_pct || 0;
  if (mode === 'winner') return p.score || 0;
  if (mode === 'all')    { const s = scoreAll(p); return s != null ? s : 0; }
  return 0;
}

function getRankColor(val, mode) {
  if (mode === 'score')  return val>=95?'#166534':val>=94?'#15803d':val>=92?'#ca8a04':'#c2410c';
  if (mode === 'pool')   return val>=65?'#1d4ed8':val>=45?'#3b82f6':val>=35?'#93c5fd':'#dbeafe';
  if (mode === 'nukk')   return val>=38?'#92400e':val>=22?'#d97706':val>=15?'#fbbf24':'#fde047';
  if (mode === 'libe')   return val>=1.4?'#5b21b6':val>=0.8?'#7c3aed':val>=0.5?'#a78bfa':'#ddd6fe';
  if (mode === 'winner') return PARTY_COLORS[val] || '#666';
  if (mode === 'all')    return val>=95?'#15803d':val>=94?'#22c55e':val>=93?'#86efac':val>=92?'#fde047':'#fef3c7';
  return '#888';
}

function getRankUnit(mode) {
  return (mode === 'pool' || mode === 'nukk' || mode === 'libe') ? ' %' : '';
}

export function buildRanking(features, mode) {
  document.getElementById('ranking-title').textContent =
    'Kaikki alueet – ' + (RANK_LABELS[mode] || mode);

  const items = features.map(f => f.properties).filter(p => p.aan && p.aan >= 100);

  if (mode === 'winner') {
    const groups = {};
    items.forEach(p => {
      const w = p.winning;
      if (!groups[w]) groups[w] = [];
      groups[w].push(p);
    });
    const parties = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
    document.getElementById('rank-list').innerHTML = parties.map(pu => {
      const list = groups[pu].sort((a, b) => (b[pu] || 0) - (a[pu] || 0));
      return `<div style="margin-bottom:12px">
        <div style="font-weight:700;color:${PARTY_COLORS[pu]||'#fff'};font-size:12px;margin-bottom:4px">${pu} (${list.length} aluetta)</div>
        ${list.slice(0, 5).map((p, i) => `
          <div class="rank-item" data-name="${p.nimi}" onclick="window.__selectArea('${p.nimi.replace(/'/g, "\\'")}')">
            <span class="rank-num">${i+1}</span>
            <div style="flex:1"><span class="rank-name">${p.nimi}</span>
            <span class="rank-score" style="color:${PARTY_COLORS[pu]}">${((p[pu]||0)/(p.aan||1)*100).toFixed(1)}%</span></div>
          </div>`).join('')}
      </div>`;
    }).join('');
    return;
  }

  const sorted = items
    .map(p => ({ ...p, _val: getRankValue(p, mode) }))
    .sort((a, b) => b._val - a._val);
  const maxV = sorted[0]?._val || 1;
  const fmt = mode === 'libe' ? 2 : 1;

  document.getElementById('rank-list').innerHTML = sorted.map((p, i) => {
    const c = getRankColor(p._val, mode);
    return `<div class="rank-item" data-name="${p.nimi}" onclick="window.__selectArea('${p.nimi.replace(/'/g, "\\'")}')">
      <span class="rank-num">${i+1}</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:4px">
          <span class="rank-name">${p.nimi}</span>
          <span class="rank-score" style="color:${c}">${p._val.toFixed(fmt)}${getRankUnit(mode)}</span>
        </div>
        <div class="rank-bar" style="width:${(p._val/maxV*100).toFixed(0)}%;background:${c}"></div>
      </div>
    </div>`;
  }).join('');
}
