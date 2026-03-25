import * as d3 from 'd3';

export const PARTY_COLORS = {
  KOK:'#1a56c4',SDP:'#E63946',VIHR:'#2DC653',VAS:'#C41E3A',
  PS:'#d4a800',KESK:'#5D8A3C',RKP:'#1A9AD7',KD:'#5B3A8E',LIIK:'#FF6B35',LIBE:'#7C3AED'
};

const scoreColor = d3.scaleLinear()
  .domain([42,52,60,68,76,82])
  .range(['#7f1d1d','#b91c1c','#ca8a04','#16a34a','#166534','#052e16'])
  .clamp(true);

const poolColor = d3.scaleLinear()
  .domain([20,40,60,80])
  .range(['#1e3a5f','#1d4ed8','#60a5fa','#dbeafe'])
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
  .domain([72,76,79,83,86,88])
  .range(['#fef3c7','#fde047','#86efac','#22c55e','#15803d','#052e16'])
  .clamp(true);

export function scoreAll(p) {
  if (!p || !p.aan || p.aan < 100) return null;
  const oik = p.oik || 1, aan = p.aan, libe = p.LIBE || 0, nukk = p.nukk || 0;
  const pool = (aan - libe) / oik * 100;
  const nuk  = nukk / oik * 100;
  const untap = pool - (libe / oik * 100);
  return Math.min(pool/70*40, 40) + Math.min(nuk/45*35, 35) + Math.min(untap/70*25, 25);
}

export function getColor(p, mode) {
  if (!p) return '#2d333b';
  if (mode === 'score')  return p.score  != null ? scoreColor(p.score)   : '#2d333b';
  if (mode === 'pool')   return p.lib_pool != null ? poolColor(p.lib_pool) : '#2d333b';
  if (mode === 'nukk')   return p.nukk_pct != null ? nukkColor(p.nukk_pct) : '#2d333b';
  if (mode === 'libe')   return p.libe_pct != null ? libeColor(p.libe_pct) : '#2d333b';
  if (mode === 'winner') return p.winning  ? PARTY_COLORS[p.winning] || '#666' : '#2d333b';
  if (mode === 'all')    { const s = scoreAll(p); return s != null ? allColor(s) : '#2d333b'; }
  return '#2d333b';
}

export const LEGEND_ITEMS = {
  score:  [['≥68 pistettä','#0e4d27'],['62–67','#157439'],['56–61','#7e851b'],['50–55','#c55f08'],['<50','#a02f14']],
  pool:   [['≥65 %','#cce2fe'],['55–65 %','#a9d0fd'],['45–55 %','#67a3f9'],['35–45 %','#2c68e7'],['<35 %','#1d4397']],
  nukk:   [['≥38 %','#ba5f09'],['30–38 %','#e78a08'],['22–30 %','#f8ae17'],['15–22 %','#fccf35'],['<15 %','#fdec85']],
  libe:   [['≥1.4 %','#44188d'],['1.1–1.4 %','#6b2dd1'],['0.8–1.1 %','#9162f3'],['0.5–0.8 %','#c2b0fc'],['<0.5 %','#e9e4fe']],
  winner: [['KOK','#1a56c4'],['SDP','#E63946'],['VAS','#C41E3A'],['PS','#d4a800'],['VIHR','#2DC653']],
  all:    [['≥86 pistettä','#0d5729'],['83–86','#1ba24d'],['79–83','#54da85'],['76–79','#c1e779'],['<76','#fde987']],
};

export const SUBTITLES = {
  score:  '40 % oikeistopooli · 35 % nukkuvat · 25 % hyödyntämätön pooli',
  pool:   'Oikeistopooli = KOK + VIHR + RKP + LIIK',
  nukk:   'Nukkuvien osuus äänioikeutetuista',
  libe:   'LIBEn ääniosuus alueella',
  winner: 'Alueen eniten ääniä saanut puolue',
  all:    'Puolueet + nukkuvat poolina · 40 % kaikki muut · 35 % nukkuvat · 25 % hyödyntämätön',
};

export const RANK_LABELS = {
  score:'konversiopisteet', pool:'oikeistopooli-%', nukk:'nukkuvat-%',
  libe:'LIBE-%', winner:'suurin puolue', all:'puolueet + nukkuvat',
};
