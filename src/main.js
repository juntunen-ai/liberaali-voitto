import './style.css';
import { getColor, LEGEND_ITEMS, SUBTITLES } from './modes.js';
import { initMap, updateMapColors, highlightArea } from './map.js';
import { showInfo, buildAAlueet, buildLegend, switchTab } from './sidebar.js';
import { buildRanking } from './ranking.js';

// Load all data in parallel
const [geo, electedVertaus, aAlueet, libePerArea, convertTargets, electedAreaVotes] =
  await Promise.all([
    fetch('/data/geo.json').then(r => r.json()),
    fetch('/data/elected_vertaus.json').then(r => r.json()),
    fetch('/data/a_alueet.json').then(r => r.json()),
    fetch('/data/libe_per_area.json').then(r => r.json()),
    fetch('/data/convert_targets.json').then(r => r.json()),
    fetch('/data/elected_area_votes.json').then(r => r.json()),
  ]);

let currentMode = 'score';
let areas;

function selectArea(name) {
  const feat = geo.features.find(f => f.properties.nimi === name);
  if (!feat) return;
  highlightArea(areas, name);
  showInfo(feat.properties, electedVertaus, electedAreaVotes, libePerArea, convertTargets);
  switchTab('info');
  document.querySelectorAll('.rank-item').forEach(el =>
    el.classList.toggle('selected', el.dataset.name === name)
  );
}

function selectAAlue(i) {
  const p = aAlueet[i];
  document.querySelectorAll('.a-alue-box').forEach((el, j) =>
    el.classList.toggle('selected', j === i)
  );
  highlightArea(areas, null); // deselect map areas
  showInfo(p, electedVertaus, electedAreaVotes, libePerArea, convertTargets);
  switchTab('info');
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
}

// Wire up global handlers (used by dynamically generated onclick attributes)
window.__selectArea  = selectArea;
window.__selectAAlue = selectAAlue;
window.setMode       = setMode;
window.switchTab     = switchTab;

// Initialize
areas = initMap(geo, selectArea);
buildRanking(geo.features, 'score');
buildLegend('score', LEGEND_ITEMS, SUBTITLES);
buildAAlueet(aAlueet, 'score');
