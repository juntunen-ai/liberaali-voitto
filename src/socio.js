import * as d3 from 'd3';
import { getColor, PARTY_COLORS } from './modes.js';
import { getSocioColor, INDICATOR_LABELS, INDICATOR_UNITS } from './socio-modes.js';

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
let storedScores = null;
let storedElectedAreaVotes = null;
let currentSocioMode = 'combined'; // combined | socio | election

export function initSocioMap(postiGeo, geo, postiDistrictMap, socioScores, electionMode, deps) {
  if (!projected) {
    projectGeo(postiGeo);
    projected = true;
  }
  storedGeo = geo;
  storedMap = postiDistrictMap;
  storedScores = socioScores;
  storedElectedAreaVotes = deps.electedAreaVotes;

  const svg = d3.select('#socio-map');
  svg.selectAll('*').remove();
  const g = svg.append('g');
  const container = document.getElementById('socio-map-container');
  const { width, height } = container.getBoundingClientRect();

  const projection = d3.geoIdentity().reflectY(true)
    .fitExtent([[20, 20], [width - 20, height - 20]], geo);
  const pathGen = d3.geoPath().projection(projection);

  svg.call(
    d3.zoom().scaleExtent([0.5, 20]).on('zoom', e => g.attr('transform', e.transform))
  );

  // Layer 1: voting districts (base, no pointer events)
  const districtLayer = g.append('g');
  districtPaths = districtLayer.selectAll('.socio-district')
    .data(geo.features)
    .enter().append('path')
    .attr('class', 'socio-district')
    .attr('d', pathGen)
    .attr('fill', d => getColor(d.properties, electionMode));

  // Layer 2: postal area overlay (clickable, filled by score)
  const overlayLayer = g.append('g');
  postiOverlay = overlayLayer.selectAll('.socio-overlay')
    .data(postiGeo.features)
    .enter().append('path')
    .attr('class', 'socio-overlay')
    .attr('d', pathGen)
    .attr('fill', d => getOverlayFill(d.properties.Posno))
    .on('click', (event, d) => {
      selectSocioArea(d.properties);
      event.stopPropagation();
    });

  svg.on('click', () => {
    postiOverlay.attr('stroke', '#e6edf3').attr('stroke-width', 1.2);
    document.getElementById('socio-info').innerHTML = '';
    document.getElementById('socio-list').style.display = '';
  });

  window.addEventListener('resize', () => {
    const { width: w, height: h } = container.getBoundingClientRect();
    projection.fitExtent([[20, 20], [w - 20, h - 20]], geo);
    districtPaths.attr('d', pathGen);
    postiOverlay.attr('d', pathGen);
  });

  buildSocioList(postiGeo.features, socioScores);
  updateSocioModeButtons();
}

function getOverlayFill(posno) {
  const s = storedScores[posno];
  if (!s) return '#2d333b';
  if (currentSocioMode === 'socio') return getSocioColor(s.socio_score);
  if (currentSocioMode === 'election') return getSocioColor(s.election_score);
  return getSocioColor(s.combined_score);
}

export function updateSocioOverlayColors() {
  if (postiOverlay) {
    postiOverlay.transition().duration(350)
      .attr('fill', d => getOverlayFill(d.properties.Posno));
  }
}

export function updateSocioDistrictColors(mode) {
  if (districtPaths) {
    districtPaths.transition().duration(350).attr('fill', d => getColor(d.properties, mode));
  }
}

function setSocioMode(mode) {
  currentSocioMode = mode;
  updateSocioOverlayColors();
  updateSocioModeButtons();
}

function updateSocioModeButtons() {
  ['combined', 'socio', 'election'].forEach(m => {
    const btn = document.getElementById('socio-mode-' + m);
    if (btn) btn.classList.toggle('active', m === currentSocioMode);
  });
}

function selectSocioArea(props) {
  const posno = props.Posno;
  const scores = storedScores[posno];
  const c = KUNTA_COLORS[props.Kunta] || '#666';

  // Highlight selected
  if (postiOverlay) {
    postiOverlay
      .attr('stroke', d => d.properties.Posno === posno ? '#fff' : '#e6edf3')
      .attr('stroke-width', d => d.properties.Posno === posno ? 2.5 : 1.2);
  }

  if (!scores) {
    document.getElementById('socio-list').style.display = 'none';
    document.getElementById('socio-info').innerHTML = `
      <h2 style="font-size:13px;font-weight:700;margin-bottom:4px">${posno} – ${props.Nimi || props.Toimip}</h2>
      <div style="font-size:11px;color:${c};margin-bottom:8px">${props.Kunta}</div>
      <p class="placeholder">Ei riittävästi dataa tälle alueelle.</p>`;
    return;
  }

  // Score color thresholds
  const scoreClr = scores.combined_score >= 65 ? '#22c55e'
    : scores.combined_score >= 50 ? '#86efac'
    : scores.combined_score >= 35 ? '#fbbf24' : '#f87171';

  // Component breakdown bars
  const componentRows = Object.entries(scores.components).map(([key, comp]) => {
    const label = INDICATOR_LABELS[key] || key;
    const unit = INDICATOR_UNITS[key] || '';
    const rawStr = comp.raw != null
      ? (unit === '€' ? comp.raw.toLocaleString('fi') + ' €' : comp.raw.toFixed(1) + unit)
      : '–';
    const rankPct = comp.rank;
    const barClr = rankPct >= 75 ? '#22c55e' : rankPct >= 50 ? '#86efac' : rankPct >= 25 ? '#fbbf24' : '#f87171';
    const direction = key === 'dependency_ratio' ? ' (↓)' : '';
    return `<div class="socio-indicator-row">
      <div class="socio-ind-header">
        <span class="socio-ind-label">${label}${direction}</span>
        <span class="socio-ind-raw">${rawStr}</span>
      </div>
      <div class="socio-ind-bar-bg">
        <div class="socio-ind-bar" style="width:${rankPct}%;background:${barClr}"></div>
      </div>
      <div class="socio-ind-rank">${rankPct.toFixed(0)}p</div>
    </div>`;
  }).join('');

  // Election data: aggregate from voting districts
  const districtNames = storedMap.get(posno) || [];
  const districts = districtNames
    .map(name => storedGeo.features.find(f => f.properties.nimi === name))
    .filter(Boolean)
    .map(f => f.properties);

  const totOik = districts.reduce((s, p) => s + (p.oik || 0), 0);
  const totAan = districts.reduce((s, p) => s + (p.aan || 0), 0);

  const parties = ['KOK','VIHR','SDP','VAS','PS','RKP','LIIK','LIBE','KESK','KD'];
  const partyTotals = {};
  parties.forEach(k => { partyTotals[k] = districts.reduce((s, p) => s + (p[k] || 0), 0); });
  const maxPartyV = Math.max(...parties.map(k => partyTotals[k]), 1);

  const partyRows = parties.map(k => {
    const v = partyTotals[k];
    const pct = totAan > 0 ? (v / totAan * 100).toFixed(1) : '0.0';
    const w = (v / maxPartyV * 100).toFixed(0);
    return `<div class="party-row">
      <span class="party-name">${k}</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${w}%;background:${PARTY_COLORS[k] || '#666'}"></div></div>
      <span class="bar-val">${pct}%</span></div>`;
  }).join('');

  // Per-district list
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

  document.getElementById('socio-list').style.display = 'none';
  document.getElementById('socio-info').innerHTML = `
    <h2 style="font-size:13px;font-weight:700;margin-bottom:4px">${posno} – ${props.Nimi || props.Toimip}</h2>
    <div style="font-size:11px;color:${c};margin-bottom:8px">${props.Kunta} · ${(scores.population || 0).toLocaleString('fi')} asukasta</div>
    <div class="score-big" style="color:${scoreClr}">${scores.combined_score.toFixed(1)}</div>
    <div class="score-label">yhdistelmäpistettä · max 100</div>
    <div class="socio-subscores">
      <div class="socio-subscore">
        <div class="socio-subscore-val">${scores.socio_score.toFixed(1)}</div>
        <div class="socio-subscore-label">sosioekonominen</div>
      </div>
      <div class="socio-subscore">
        <div class="socio-subscore-val">${scores.election_score != null ? scores.election_score.toFixed(1) : '–'}</div>
        <div class="socio-subscore-label">vaalitulos</div>
      </div>
    </div>
    <div class="section-title" style="margin-top:12px">Sosioekonominen profiili</div>
    ${componentRows}
    ${districts.length > 0 ? `
    <div class="section-title" style="margin-top:12px">Ääntenjakauma (${districts.length} äänestysaluetta)</div>
    <div class="stat-row"><span class="stat-label">Äänioikeutettuja</span><span class="stat-val">${totOik.toLocaleString('fi')}</span></div>
    <div class="stat-row"><span class="stat-label">Äänestäneet</span><span class="stat-val">${totAan.toLocaleString('fi')} · ${totOik > 0 ? (totAan / totOik * 100).toFixed(1) : 0} %</span></div>
    ${partyRows}
    <div class="section-title" style="margin-top:10px">Äänestysalueet</div>
    ${districtRows}` : '<p class="placeholder" style="margin-top:12px">Ei äänestysalueita tällä postinumeroalueella.</p>'}`;
}

function buildSocioList(postiFeatures, socioScores) {
  const sorted = [...postiFeatures]
    .map(f => ({ f, s: socioScores[f.properties.Posno] }))
    .filter(({ s }) => s)
    .sort((a, b) => b.s.combined_score - a.s.combined_score);

  document.getElementById('socio-list').innerHTML = sorted.map(({ f, s }, i) => {
    const p = f.properties;
    const c = KUNTA_COLORS[p.Kunta] || '#666';
    const scoreClr = s.combined_score >= 65 ? '#22c55e'
      : s.combined_score >= 50 ? '#86efac'
      : s.combined_score >= 35 ? '#fbbf24' : '#f87171';
    return `<div class="socio-rank-row" onclick="window.__selectSocioArea('${p.Posno}')">
      <span class="socio-rank-num">${i + 1}</span>
      <span class="socio-rank-code" style="color:${c}">${p.Posno}</span>
      <span class="socio-rank-name">${p.Nimi || p.Toimip}</span>
      <span class="socio-rank-score" style="color:${scoreClr}">${s.combined_score.toFixed(1)}</span>
    </div>`;
  }).join('');
}

window.__selectSocioArea = function (code) {
  if (postiOverlay) {
    const feat = postiOverlay.data().find(d => d.properties.Posno === code);
    if (feat) selectSocioArea(feat.properties);
  }
};

window.__setSocioMode = setSocioMode;
