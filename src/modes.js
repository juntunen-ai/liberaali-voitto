import * as d3 from 'd3';

export const PARTY_COLORS = {
  KOK:'#1a56c4',SDP:'#E63946',VIHR:'#2DC653',VAS:'#C41E3A',
  PS:'#d4a800',KESK:'#5D8A3C',RKP:'#1A9AD7',KD:'#5B3A8E',LIIK:'#FF6B35',LIBE:'#7C3AED'
};

// Score mode: darker = higher conversion score (party hue darkened by score)
const scoreDarken = d3.scaleLinear().domain([90, 94, 96]).range([0.0, 0.15, 0.35]).clamp(true);

const poolColor = d3.scaleLinear()
  .domain([20,40,60,80])
  .range(['#dbeafe','#60a5fa','#1d4ed8','#1e3a5f'])
  .clamp(true);

const nukkColor = d3.scaleLinear()
  .domain([10,25,40,55,83])
  .range(['#fef9c3','#fde047','#f59e0b','#b45309','#78350f'])
  .clamp(true);

const libeColor = d3.scaleLinear()
  .domain([0,0.5,1.5,3,5])
  .range(['#f5f3ff','#c4b5fd','#7c3aed','#5b21b6','#2e1065'])
  .clamp(true);

const allColor = d3.scaleLinear()
  .domain([90,92,93,94,95,96])
  .range(['#fef3c7','#fde047','#86efac','#22c55e','#15803d','#052e16'])
  .clamp(true);

// Conversion formula: 65% pool + 10% nukk + 25% untapped
export function scoreAll(p) {
  if (!p || !p.aan || p.aan < 100) return null;
  const oik = p.oik || 1, aan = p.aan, libe = p.LIBE || 0, nukk = p.nukk || 0;
  const pool = (aan - libe) / oik * 100;
  const nuk  = nukk / oik * 100;
  const untap = pool - (libe / oik * 100);
  return Math.min(pool/70*65, 65) + Math.min(nuk/45*10, 10) + Math.min(untap/70*25, 25);
}

// Recompute p.score for all features using the current formula
export function recomputeScores(features) {
  for (const f of features) {
    const s = scoreAll(f.properties);
    if (s != null) f.properties.score = Math.round(s * 10) / 10;
  }
}

function partyScoreColor(p) {
  const partyClr = PARTY_COLORS[p.winning] || '#666';
  if (p.score == null) return partyClr;
  const t = scoreDarken(p.score);
  return d3.interpolate(partyClr, '#0d1117')(t);
}

export function getColor(p, mode) {
  if (!p) return '#2d333b';
  if (mode === 'score')  return p.winning ? partyScoreColor(p) : '#2d333b';
  if (mode === 'pool')   return p.lib_pool != null ? poolColor(p.lib_pool) : '#2d333b';
  if (mode === 'nukk')   return p.nukk_pct != null ? nukkColor(p.nukk_pct) : '#2d333b';
  if (mode === 'libe')   return p.libe_pct != null ? libeColor(p.libe_pct) : '#2d333b';
  if (mode === 'winner') return p.winning  ? PARTY_COLORS[p.winning] || '#666' : '#2d333b';
  if (mode === 'all')    { const s = scoreAll(p); return s != null ? allColor(s) : '#2d333b'; }
  return '#2d333b';
}

export const LEGEND_ITEMS = {
  score:  [['≥95 pistettä','#1a56c4'],['94–95','#3b6fcf'],['92–94','#6d92da'],['<92','#a4b9e6'],['Väri = suurin puolue','']],
  pool:   [['≥65 %','#1d4397'],['55–65 %','#2c68e7'],['45–55 %','#67a3f9'],['35–45 %','#a9d0fd'],['<35 %','#cce2fe']],
  nukk:   [['≥38 %','#ba5f09'],['30–38 %','#e78a08'],['22–30 %','#f8ae17'],['15–22 %','#fccf35'],['<15 %','#fdec85']],
  libe:   [['≥1.4 %','#44188d'],['1.1–1.4 %','#6b2dd1'],['0.8–1.1 %','#9162f3'],['0.5–0.8 %','#c2b0fc'],['<0.5 %','#e9e4fe']],
  winner: [['KOK','#1a56c4'],['SDP','#E63946'],['VAS','#C41E3A'],['PS','#d4a800'],['VIHR','#2DC653']],
  all:    [['≥95 pistettä','#0d5729'],['94–95','#1ba24d'],['93–94','#54da85'],['92–93','#c1e779'],['<92','#fde987']],
};

export const SUBTITLES = {
  score:  'Väri = suurin puolue · tummempi = korkeampi konversiopotentiaali LIBElle',
  pool:   'Oikeistopooli = KOK + VIHR + RKP + LIIK',
  nukk:   'Nukkuvien osuus äänioikeutetuista',
  libe:   'LIBEn ääniosuus alueella',
  winner: 'Alueen eniten ääniä saanut puolue',
  all:    'Puolueet + nukkuvat poolina · 65 % tavoitettavuus · 10 % nukkuvat · 25 % hyödyntämätön',
};

export const RANK_LABELS = {
  score:'konversiopisteet', pool:'oikeistopooli-%', nukk:'nukkuvat-%',
  libe:'LIBE-%', winner:'suurin puolue', all:'puolueet + nukkuvat',
};
