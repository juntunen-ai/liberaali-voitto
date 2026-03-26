import './style.css';
import { LEGEND_ITEMS, SUBTITLES, recomputeScores } from './modes.js';
import { initMap, updateMapColors, highlightArea } from './map.js';
import { showInfo, buildAAlueet, buildLegend, switchTab } from './sidebar.js';
import { buildRanking } from './ranking.js';

// Load all data in parallel (use BASE_URL for GitHub Pages subpath)
const base = import.meta.env.BASE_URL;
const [geo, municipalBorders, electedVertaus, aAlueet, libePerArea, convertTargets, electedAreaVotes] =
  await Promise.all([
    fetch(base + 'data/geo.json').then(r => r.json()),
    fetch(base + 'data/municipal_borders.json').then(r => r.json()),
    fetch(base + 'data/elected_vertaus.json').then(r => r.json()),
    fetch(base + 'data/a_alueet.json').then(r => r.json()),
    fetch(base + 'data/libe_per_area.json').then(r => r.json()),
    fetch(base + 'data/convert_targets.json').then(r => r.json()),
    fetch(base + 'data/elected_area_votes.json').then(r => r.json()),
  ]);

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
  buildAAlueet(aAlueet, mode);
  buildLegend(mode, LEGEND_ITEMS, SUBTITLES);
  buildRanking(geo.features, mode);
  refreshSelection();
}

// Wire up global handlers (used by dynamically generated onclick attributes)
window.__selectArea  = selectArea;
window.__selectAAlue = selectAAlue;
window.setMode       = setMode;
window.switchTab     = switchTab;

// Initialize
areas = initMap(geo, municipalBorders, selectArea, clearSelection);
buildRanking(geo.features, 'score');
buildLegend('score', LEGEND_ITEMS, SUBTITLES);
buildAAlueet(aAlueet, 'score');
