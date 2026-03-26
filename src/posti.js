import * as d3 from 'd3';
import { getColor, PARTY_COLORS } from './modes.js';

function toMercator(lon, lat) {
  const x = lon * Math.PI / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
  return [x, y];
}

function projectGeo(geo) {
  for (const f of geo.features) {
    const g = f.geometry;
    if (g.type === 'Polygon') {
      g.coordinates = g.coordinates.map(ring =>
        ring.map(([lon, lat]) => toMercator(lon, lat))
      );
    } else if (g.type === 'MultiPolygon') {
      g.coordinates = g.coordinates.map(poly =>
        poly.map(ring => ring.map(([lon, lat]) => toMercator(lon, lat)))
      );
    }
  }
}

const KUNTA_COLORS = {
  Helsinki: '#F9B000',
  Espoo: '#3b82f6',
  Vantaa: '#22c55e',
};

let districtPaths = null;
let postiOverlay = null;
let projected = false;
let storedGeo = null;
let storedMap = null;
let storedElectedAreaVotes = null;

export function initPostiMap(postiGeo, geo, postiDistrictMap, mode, deps) {
  if (!projected) {
    projectGeo(postiGeo);
    projected = true;
  }
  storedGeo = geo;
  storedMap = postiDistrictMap;
  storedElectedAreaVotes = deps.electedAreaVotes;

  const svg = d3.select('#posti-map');
  svg.selectAll('*').remove();
  const g = svg.append('g');
  const container = document.getElementById('posti-map-container');
  const { width, height } = container.getBoundingClientRect();

  const projection = d3.geoIdentity().reflectY(true)
    .fitExtent([[20, 20], [width - 20, height - 20]], geo);
  const pathGen = d3.geoPath().projection(projection);

  svg.call(
    d3.zoom().scaleExtent([0.5, 20]).on('zoom', e => g.attr('transform', e.transform))
  );

  // Layer 1: voting districts (base, no pointer events)
  const districtLayer = g.append('g');
  districtPaths = districtLayer.selectAll('.posti-district')
    .data(geo.features)
    .enter().append('path')
    .attr('class', 'posti-district')
    .attr('d', pathGen)
    .attr('fill', d => getColor(d.properties, mode));

  // Layer 2: postal area overlay (clickable)
  const overlayLayer = g.append('g');
  postiOverlay = overlayLayer.selectAll('.posti-overlay')
    .data(postiGeo.features)
    .enter().append('path')
    .attr('class', 'posti-overlay')
    .attr('d', pathGen)
    .on('click', (event, d) => {
      selectPostiArea(d.properties);
      event.stopPropagation();
    });

  svg.on('click', () => {
    postiOverlay.attr('stroke', '#e6edf3').attr('stroke-width', 1.2);
    districtPaths.attr('stroke', '#1a1a2e').attr('stroke-width', 0.3);
    document.getElementById('posti-info').innerHTML = '';
    document.getElementById('posti-list').style.display = '';
  });

  window.addEventListener('resize', () => {
    const { width: w, height: h } = container.getBoundingClientRect();
    projection.fitExtent([[20, 20], [w - 20, h - 20]], geo);
    districtPaths.attr('d', pathGen);
    postiOverlay.attr('d', pathGen);
  });

  buildPostiList(postiGeo.features, geo, postiDistrictMap);
}

export function updatePostiColors(mode) {
  if (districtPaths) {
    districtPaths.transition().duration(350).attr('fill', d => getColor(d.properties, mode));
  }
}

function selectPostiArea(props) {
  const geo = storedGeo;
  const postiDistrictMap = storedMap;

  // Highlight selected postal area
  if (postiOverlay) {
    postiOverlay
      .attr('stroke', d => d.properties.Posno === props.Posno ? '#fff' : '#e6edf3')
      .attr('stroke-width', d => d.properties.Posno === props.Posno ? 2.5 : 1.2);
  }
  // Highlight districts in this postal area
  const districtNames = postiDistrictMap.get(props.Posno) || [];
  if (districtPaths) {
    districtPaths
      .attr('stroke', d => districtNames.includes(d.properties.nimi) ? '#fff' : '#1a1a2e')
      .attr('stroke-width', d => districtNames.includes(d.properties.nimi) ? 0.8 : 0.3);
  }

  const districts = districtNames
    .map(name => geo.features.find(f => f.properties.nimi === name))
    .filter(Boolean)
    .map(f => f.properties);

  const c = KUNTA_COLORS[props.Kunta] || '#666';

  // Aggregate stats
  const totOik = districts.reduce((s, p) => s + (p.oik || 0), 0);
  const totAan = districts.reduce((s, p) => s + (p.aan || 0), 0);
  const totLibe = districts.reduce((s, p) => s + (p.LIBE || 0), 0);
  const totNukk = districts.reduce((s, p) => s + (p.nukk || 0), 0);

  // Party totals
  const parties = ['KOK','VIHR','SDP','VAS','PS','RKP','LIIK','LIBE','KESK','KD'];
  const partyTotals = {};
  parties.forEach(k => { partyTotals[k] = districts.reduce((s, p) => s + (p[k] || 0), 0); });
  const maxPartyV = Math.max(...parties.map(k => partyTotals[k]), 1);

  const partyRows = parties.map(k => {
    const v = partyTotals[k], pct = totAan > 0 ? (v / totAan * 100).toFixed(1) : '0.0';
    const w = (v / maxPartyV * 100).toFixed(0);
    return `<div class="party-row">
      <span class="party-name">${k}</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${w}%;background:${PARTY_COLORS[k] || '#666'}"></div></div>
      <span class="bar-val">${pct}%</span></div>`;
  }).join('');

  // Adjusted votes (without elected candidates)
  const electedAreaVotes = storedElectedAreaVotes || {};
  const adjTotals = {};
  parties.forEach(k => {
    adjTotals[k] = districts.reduce((s, p) => {
      const elected = (electedAreaVotes[p.nimi] || {})[k] || 0;
      return s + Math.max((p[k] || 0) - elected, 0);
    }, 0);
  });
  const adjRows = parties
    .map(k => ({ k, adj: adjTotals[k] }))
    .filter(x => x.adj > 0)
    .sort((a, b) => b.adj - a.adj);
  const maxAdj = Math.max(...adjRows.map(x => x.adj), 1);
  const adjPartyRows = adjRows.map(({ k, adj }) => {
    const pct = totAan > 0 ? (adj / totAan * 100).toFixed(1) : '0.0';
    const w = (adj / maxAdj * 100).toFixed(0);
    return `<div class="party-row">
      <span class="party-name">${k}</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${w}%;background:${PARTY_COLORS[k] || '#666'}"></div></div>
      <span class="bar-val">${adj.toLocaleString('fi')} · ${pct}%</span></div>`;
  }).join('');

  // Weighted average score (by äänioikeutetut)
  const weightedPairs = districts.filter(p => p.score != null && p.oik > 0);
  const totalWeight = weightedPairs.reduce((s, p) => s + p.oik, 0);
  const avgScore = totalWeight > 0
    ? weightedPairs.reduce((s, p) => s + p.score * p.oik, 0) / totalWeight
    : null;
  const scoreClr = avgScore >= 75 ? '#22c55e' : avgScore >= 55 ? '#86efac' : avgScore >= 35 ? '#fbbf24' : '#f87171';

  // Per-district rows
  const districtRows = districts
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map(p => {
      const sc = p.score != null ? p.score.toFixed(1) : '–';
      const scClr = p.score >= 75 ? '#22c55e' : p.score >= 55 ? '#86efac' : p.score >= 35 ? '#fbbf24' : '#f87171';
      const wClr = PARTY_COLORS[p.winning] || '#666';
      return `<div class="posti-district-row">
        <span class="posti-dist-name">${p.nimi}</span>
        <span class="posti-dist-score" style="color:${scClr}">${sc}</span>
        <span class="posti-dist-party" style="background:${wClr}">${p.winning || '–'}</span>
      </div>`;
    }).join('');

  // Hide list, show detail
  document.getElementById('posti-list').style.display = 'none';
  document.getElementById('posti-info').innerHTML = `
    <h2 style="font-size:13px;font-weight:700;margin-bottom:4px">${props.Posno} – ${props.Nimi || props.Toimip}</h2>
    <div style="font-size:11px;color:${c};margin-bottom:8px">${props.Kunta}</div>
    ${avgScore != null ? `
    <div class="score-big" style="color:${scoreClr}">${avgScore.toFixed(1)}</div>
    <div class="score-label">konversiopistettä · painotettu keskiarvo</div>` : ''}
    <div class="stat-row"><span class="stat-label">Äänestysalueita</span><span class="stat-val">${districts.length}</span></div>
    <div class="stat-row"><span class="stat-label">Äänioikeutettuja</span><span class="stat-val">${totOik.toLocaleString('fi')}</span></div>
    <div class="stat-row"><span class="stat-label">Äänestäneet</span><span class="stat-val">${totAan.toLocaleString('fi')} · ${totOik > 0 ? (totAan / totOik * 100).toFixed(1) : 0} %</span></div>
    <div class="stat-row"><span class="stat-label">Nukkuvat</span><span class="stat-val">${totNukk.toLocaleString('fi')} · ${totOik > 0 ? (totNukk / totOik * 100).toFixed(1) : 0} %</span></div>
    <div class="stat-row"><span class="stat-label">Oikeistopooli</span><span class="stat-val">${totOik > 0 ? ((partyTotals.KOK + partyTotals.VIHR + partyTotals.RKP + partyTotals.LIIK) / totOik * 100).toFixed(1) : 0} %</span></div>
    <div class="stat-row"><span class="stat-label">LIBE äänet</span><span class="stat-val">${totLibe} · ${totAan > 0 ? (totLibe / totAan * 100).toFixed(2) : 0} %</span></div>
    <div class="section-title">Ääntenjakauma</div>
    ${partyRows}
    <div class="section-title" style="margin-top:10px">Konvertoitavissa (ilman valittuja)</div>
    ${adjPartyRows}
    <div class="section-title" style="margin-top:10px">Äänestysalueet</div>
    ${districtRows}`;
}

function buildPostiList(postiFeatures, geo, postiDistrictMap) {
  const sorted = [...postiFeatures].sort((a, b) =>
    a.properties.Posno.localeCompare(b.properties.Posno)
  );

  document.getElementById('posti-list').innerHTML = sorted.map(f => {
    const p = f.properties;
    const c = KUNTA_COLORS[p.Kunta] || '#666';
    const districtNames = postiDistrictMap.get(p.Posno) || [];
    const districts = districtNames
      .map(name => geo.features.find(ff => ff.properties.nimi === name))
      .filter(Boolean)
      .map(ff => ff.properties)
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    if (districts.length === 0) return '';

    const aaRows = districts.map(d => {
      const wClr = PARTY_COLORS[d.winning] || '#666';
      const sc = d.score != null ? d.score.toFixed(1) : '–';
      const scClr = d.score >= 75 ? '#22c55e' : d.score >= 55 ? '#86efac' : d.score >= 35 ? '#fbbf24' : '#f87171';
      return `<div class="posti-aa-row" onclick="window.__selectPostiArea('${p.Posno}')">
        <span class="posti-aa-name">${d.nimi}</span>
        <span style="color:${scClr};font-weight:700;font-size:10px">${sc}</span>
        <span class="posti-aa-party" style="background:${wClr}">${d.winning || '–'}</span>
      </div>`;
    }).join('');

    return `<div class="posti-group">
      <div class="posti-group-header" style="color:${c}" onclick="window.__selectPostiArea('${p.Posno}')">
        <span class="posti-group-code">${p.Posno}</span>
        <span class="posti-group-name">${p.Nimi || p.Toimip}</span>
        <span class="posti-group-count">${districts.length} aa</span>
      </div>
      ${aaRows}
    </div>`;
  }).join('');
}

window.__selectPostiArea = function (code) {
  if (postiOverlay) {
    const feat = postiOverlay.data().find(d => d.properties.Posno === code);
    if (feat) selectPostiArea(feat.properties);
  }
};
