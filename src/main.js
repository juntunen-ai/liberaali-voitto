import './style.css';
import { LEGEND_ITEMS, SUBTITLES, recomputeScores } from './modes.js';
import { initMap, updateMapColors, highlightArea } from './map.js';
import { showInfo, buildAAlueet, buildLegend, switchTab } from './sidebar.js';
import { buildRanking } from './ranking.js';
import { initPostiMap, updatePostiColors } from './posti.js';
import { initSocioMap, updateSocioDistrictColors } from './socio.js';
import { computeSocioScores } from './socio-modes.js';
import { buildPostalDistrictMapping } from './geo-utils.js';

// Load all data in parallel (use BASE_URL for GitHub Pages subpath)
const base = import.meta.env.BASE_URL;
const [geo, municipalBorders, electedVertaus, aAlueet, libePerArea, convertTargets, electedAreaVotes, postiGeo, paavoSocio] =
  await Promise.all([
    fetch(base + 'data/geo.json').then(r => r.json()),
    fetch(base + 'data/municipal_borders.json').then(r => r.json()),
    fetch(base + 'data/elected_vertaus.json').then(r => r.json()),
    fetch(base + 'data/a_alueet.json').then(r => r.json()),
    fetch(base + 'data/libe_per_area.json').then(r => r.json()),
    fetch(base + 'data/convert_targets.json').then(r => r.json()),
    fetch(base + 'data/elected_area_votes.json').then(r => r.json()),
    fetch(base + 'data/postinumero.json').then(r => r.json()),
    fetch(base + 'data/paavo_socio.json').then(r => r.json()),
  ]);

// Compute postal→district mapping BEFORE any projection (uses WGS84 coordinates)
const postiDistrictMap = buildPostalDistrictMapping(geo.features, postiGeo.features);

// Derive all displayed metrics and the two separate potential models.
recomputeScores(geo.features, aAlueet);

let currentMode = 'score';
let areas;
let selectedAreaName = null;
let selectedAAlueIndex = null;

function selectArea(name) {
  const feat = geo.features.find(f => f.properties.nimi === name);
  if (!feat) return;
  selectedAreaName = name;
  selectedAAlueIndex = null;
  highlightArea(areas, name);
  showInfo(feat.properties, electedVertaus, electedAreaVotes, libePerArea, convertTargets, currentMode);
  switchTab('info');
  document.querySelectorAll('.a-alue-box').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.rank-item').forEach(el =>
    el.classList.toggle('selected', el.dataset.name === name)
  );
}

function selectAAlue(i) {
  const p = aAlueet[i];
  selectedAreaName = null;
  selectedAAlueIndex = i;
  document.querySelectorAll('.a-alue-box').forEach((el, j) =>
    el.classList.toggle('selected', j === i)
  );
  highlightArea(areas, null); // deselect map areas
  showInfo(p, electedVertaus, electedAreaVotes, libePerArea, convertTargets, currentMode);
  switchTab('info');
  document.querySelectorAll('.rank-item').forEach(el => el.classList.remove('selected'));
}

function clearSelection() {
  selectedAreaName = null;
  selectedAAlueIndex = null;
}

function refreshSelection() {
  if (selectedAreaName) {
    selectArea(selectedAreaName);
    return;
  }

  if (selectedAAlueIndex != null) {
    selectAAlue(selectedAAlueIndex);
  }
}

function setMode(mode) {
  currentMode = mode;
  ['score','pool','nukk','libe','winner','all'].forEach(m =>
    document.getElementById('btn-' + m).classList.toggle('active', m === mode)
  );
  updateMapColors(areas, mode);
  updatePostiColors(mode);
  updateSocioDistrictColors(mode);
  buildAAlueet(aAlueet, mode);
  buildLegend(mode, LEGEND_ITEMS, SUBTITLES);
  buildRanking(geo.features, mode);
  refreshSelection();
}

// Compute election scores per postal area (weighted avg of district scores by oik)
const electionScoresPerPostal = {};
for (const [posno, districtNames] of postiDistrictMap.entries()) {
  let totalOik = 0, weightedScore = 0;
  for (const name of districtNames) {
    const feat = geo.features.find(f => f.properties.nimi === name);
    if (feat && feat.properties.score != null && feat.properties.oik > 0) {
      totalOik += feat.properties.oik;
      weightedScore += feat.properties.oik * feat.properties.score;
    }
  }
  if (totalOik > 0) electionScoresPerPostal[posno] = weightedScore / totalOik;
}

// Compute socioeconomic scores (combined = 50% election + 50% socio)
const socioScores = computeSocioScores(paavoSocio, electionScoresPerPostal);

// Page toggling: election view vs posti view vs socio view
let postiInited = false;
let socioInited = false;
let activePage = 'election'; // election | posti | socio

function showPage(page) {
  activePage = page;
  document.getElementById('page-election').classList.toggle('active', page === 'election');
  document.getElementById('page-posti').classList.toggle('active', page === 'posti');
  document.getElementById('page-socio').classList.toggle('active', page === 'socio');
  document.getElementById('btn-posti').classList.toggle('active', page === 'posti');
  document.getElementById('btn-socio').classList.toggle('active', page === 'socio');
}

function togglePosti() {
  showPage(activePage === 'posti' ? 'election' : 'posti');

  if (activePage === 'posti' && !postiInited) {
    postiInited = true;
    initPostiMap(postiGeo, geo, postiDistrictMap, currentMode, {
      electedAreaVotes
    });
  }
}

function toggleSocio() {
  showPage(activePage === 'socio' ? 'election' : 'socio');

  if (activePage === 'socio' && !socioInited) {
    socioInited = true;
    initSocioMap(postiGeo, geo, postiDistrictMap, socioScores, currentMode, {
      electedAreaVotes
    });
  }
}

// Wire up global handlers (used by dynamically generated onclick attributes)
window.__selectArea  = selectArea;
window.__selectAAlue = selectAAlue;
window.setMode       = setMode;
window.switchTab     = switchTab;
window.togglePosti   = togglePosti;
window.toggleSocio   = toggleSocio;

// Initialize
areas = initMap(geo, municipalBorders, selectArea, clearSelection);
buildRanking(geo.features, 'score');
buildLegend('score', LEGEND_ITEMS, SUBTITLES);
buildAAlueet(aAlueet, 'score');
