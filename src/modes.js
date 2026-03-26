import * as d3 from 'd3';

export const PARTY_COLORS = {
  KOK:'#1a56c4',SDP:'#E63946',VIHR:'#2DC653',VAS:'#C41E3A',
  PS:'#d4a800',KESK:'#5D8A3C',RKP:'#1A9AD7',KD:'#5B3A8E',LIIK:'#FF6B35',LIBE:'#F9B000'
};

const PARTIES = ['KOK','VIHR','SDP','VAS','PS','RKP','LIIK','LIBE','KESK','KD'];
const POOL_PARTIES = ['KOK','VIHR','RKP','LIIK'];
const FALLBACK_COLOR = '#2d333b';

const poolColor = d3.scaleLinear()
  .domain([15,30,45,60,75])
  .range(['#dbeafe','#93c5fd','#3b82f6','#1d4ed8','#172554'])
  .clamp(true);

const nukkColor = d3.scaleLinear()
  .domain([10,20,30,40,50])
  .range(['#fef9c3','#fde047','#f59e0b','#b45309','#78350f'])
  .clamp(true);

const libeColor = d3.scaleLinear()
  .domain([0,0.5,1,2,4])
  .range(['#fef3c7','#fcd34d','#F9B000','#b45309','#78350f'])
  .clamp(true);

const potentialShadeScales = {
  score: d3.scaleLinear().domain([0, 50, 100]).range([0, 0.58, 1]).clamp(true),
  all: d3.scaleLinear().domain([0, 50, 100]).range([0, 0.58, 1]).clamp(true),
};

function pct(part, whole) {
  return whole ? part / whole * 100 : 0;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function sortNumeric(values) {
  return values.filter(Number.isFinite).sort((a, b) => a - b);
}

function getPoolVotes(p) {
  return POOL_PARTIES.reduce((sum, party) => sum + (p[party] || 0), 0);
}

function getTopTwoMarginPct(p) {
  const votes = PARTIES.map(k => p[k] || 0).sort((a, b) => b - a);
  return pct((votes[0] || 0) - (votes[1] || 0), p.aan || 1);
}

function getFragmentation(p) {
  const shares = PARTIES
    .map(k => (p[k] || 0) / (p.aan || 1))
    .filter(Boolean);
  const hhi = shares.reduce((sum, share) => sum + share * share, 0);
  return hhi ? 1 / hhi : 0;
}

function createPercentileRank(values, { invert = false } = {}) {
  const sorted = sortNumeric(values);
  const lastIndex = Math.max(sorted.length - 1, 1);

  return value => {
    if (!sorted.length || !Number.isFinite(value)) return 0;

    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] <= value) lo = mid + 1;
      else hi = mid;
    }

    const rank = Math.max(0, (lo - 1) / lastIndex);
    return invert ? 1 - rank : rank;
  };
}

function createPotentialShadeScale(values) {
  const sorted = sortNumeric(values);
  if (!sorted.length) {
    return d3.scaleLinear().domain([0, 50, 100]).range([0, 0.58, 1]).clamp(true);
  }

  const q10 = d3.quantileSorted(sorted, 0.10) ?? sorted[0];
  const q50 = d3.quantileSorted(sorted, 0.50) ?? sorted[Math.floor(sorted.length / 2)];
  const q90 = d3.quantileSorted(sorted, 0.90) ?? sorted[sorted.length - 1];

  if (q10 === q50 && q50 === q90) {
    return d3.scaleLinear().domain([0, 1]).range([0.58, 0.58]).clamp(true);
  }

  return d3.scaleLinear()
    .domain([q10, q50, q90])
    .range([0, 0.58, 1])
    .clamp(true);
}

function assignDerivedMetrics(p) {
  const oik = p.oik || 0;
  const aan = p.aan || 0;
  const libeVotes = p.LIBE || 0;
  const nukk = p.nukk ?? Math.max(oik - aan, 0);
  const poolVotes = getPoolVotes(p);

  p.nukk = nukk;
  p.turnout_pct_raw = pct(aan, oik);
  p.nukk_pct_raw = pct(nukk, oik);
  p.libe_pct_raw = pct(libeVotes, aan);
  p.libe_oik_pct = pct(libeVotes, oik);
  p.lib_pool_raw = pct(poolVotes, oik);
  p.pool_vote_pct = pct(poolVotes, aan);
  p.pool_gap_pct = Math.max(p.lib_pool_raw - p.libe_oik_pct, 0);
  p.active_non_libe_pct = Math.max(p.turnout_pct_raw - p.libe_oik_pct, 0);
  p.top_margin_pct = getTopTwoMarginPct(p);
  p.competition_pct = Math.max(0, 100 - p.top_margin_pct);
  p.fragmentation = getFragmentation(p);

  // Keep displayed summary fields in sync with the current methodology.
  p.aanes_pct = round1(p.turnout_pct_raw);
  p.nukk_pct = round1(p.nukk_pct_raw);
  p.libe_pct = round2(p.libe_pct_raw);
  p.lib_pool = round1(p.lib_pool_raw);
}

function scoreSimilarity(p, scorers) {
  return 100 * (
    0.35 * scorers.poolOnEligible(p.lib_pool_raw) +
    0.20 * scorers.poolOnVoters(p.pool_vote_pct) +
    0.30 * scorers.poolGap(p.pool_gap_pct) +
    0.15 * scorers.openCompetition(p.competition_pct)
  );
}

function scoreOpen(p, scorers) {
  return 100 * (
    0.25 * scorers.activeNonLibe(p.active_non_libe_pct) +
    0.20 * scorers.sleepers(p.nukk_pct_raw) +
    0.20 * scorers.fragmentation(p.fragmentation) +
    0.20 * scorers.openCompetition(p.competition_pct) +
    0.15 * scorers.lowLibe(p.libe_pct_raw)
  );
}

function buildScorers(baseRecords) {
  return {
    poolOnEligible: createPercentileRank(baseRecords.map(p => p.lib_pool_raw)),
    poolOnVoters: createPercentileRank(baseRecords.map(p => p.pool_vote_pct)),
    poolGap: createPercentileRank(baseRecords.map(p => p.pool_gap_pct)),
    activeNonLibe: createPercentileRank(baseRecords.map(p => p.active_non_libe_pct)),
    sleepers: createPercentileRank(baseRecords.map(p => p.nukk_pct_raw)),
    fragmentation: createPercentileRank(baseRecords.map(p => p.fragmentation)),
    openCompetition: createPercentileRank(baseRecords.map(p => p.competition_pct)),
    lowLibe: createPercentileRank(baseRecords.map(p => p.libe_pct_raw), { invert: true }),
  };
}

function getPotentialColor(p, mode) {
  const partyClr = PARTY_COLORS[p.winning] || '#64748b';
  const value = mode === 'all' ? p.all_score : p.score;
  const shade = potentialShadeScales[mode](value ?? 0);

  const light = d3.interpolateLab('#f4f8ff', partyClr)(0.68);
  const dark = d3.interpolateLab(partyClr, '#1f2937')(0.28);

  if (shade <= 0.5) {
    return d3.interpolateLab(light, partyClr)(shade / 0.5);
  }

  return d3.interpolateLab(partyClr, dark)((shade - 0.5) / 0.5);
}

export function recomputeScores(features, areaSummaries = []) {
  const records = [...features.map(f => f.properties), ...areaSummaries];
  records.forEach(assignDerivedMetrics);

  const baseRecords = features
    .map(f => f.properties)
    .filter(p => p.aan && p.aan >= 100);

  const scorers = buildScorers(baseRecords);

  for (const p of records) {
    p.score = round1(scoreSimilarity(p, scorers));
    p.all_score = round1(scoreOpen(p, scorers));
  }

  potentialShadeScales.score = createPotentialShadeScale(baseRecords.map(p => p.score));
  potentialShadeScales.all = createPotentialShadeScale(baseRecords.map(p => p.all_score));
}

export function getColor(p, mode) {
  if (!p) return FALLBACK_COLOR;
  if (mode === 'score')  return p.winning ? getPotentialColor(p, 'score') : FALLBACK_COLOR;
  if (mode === 'pool')   return p.lib_pool != null ? poolColor(p.lib_pool) : FALLBACK_COLOR;
  if (mode === 'nukk')   return p.nukk_pct != null ? nukkColor(p.nukk_pct) : FALLBACK_COLOR;
  if (mode === 'libe')   return p.libe_pct != null ? libeColor(p.libe_pct) : FALLBACK_COLOR;
  if (mode === 'winner') return p.winning ? PARTY_COLORS[p.winning] || '#666' : FALLBACK_COLOR;
  if (mode === 'all')    return p.winning ? getPotentialColor(p, 'all') : FALLBACK_COLOR;
  return FALLBACK_COLOR;
}

export function getModeMetric(p, mode) {
  if (!p) return { value: null, label: '', decimals: 1, suffix: '' };
  if (mode === 'score')  return { value: p.score, label: 'oikeistopoolin potentiaalipistettä', decimals: 1, suffix: '', max100: true };
  if (mode === 'pool')   return { value: p.lib_pool, label: 'oikeistopoolia äänioikeutetuista', decimals: 1, suffix: ' %', max100: false };
  if (mode === 'nukk')   return { value: p.nukk_pct, label: 'nukkuvien osuutta', decimals: 1, suffix: ' %', max100: false };
  if (mode === 'libe')   return { value: p.libe_pct, label: 'LIBE-osuutta äänestäneistä', decimals: 2, suffix: ' %', max100: false };
  if (mode === 'winner') return { value: p.winning || '–', label: 'alueen suurin puolue', text: true, suffix: '', max100: false };
  if (mode === 'all')    return { value: p.all_score, label: 'puolueet + nukkuvat -pistettä', decimals: 1, suffix: '', max100: true };
  return { value: null, label: '', decimals: 1, suffix: '' };
}

export const LEGEND_ITEMS = {
  score:  [['Korkea potentiaali','#20324c'],['Selvästi keskitason yläpuolella','#466b96'],['Keskitaso','#7ea4c6'],['Matala potentiaali','#d9e8f6'],['Väri = suurin puolue · tummempi = korkeampi oikeistopoolin potentiaali','']],
  pool:   [['≥65 %','#172554'],['45–65 %','#1d4ed8'],['30–45 %','#60a5fa'],['<30 %','#dbeafe']],
  nukk:   [['≥40 %','#78350f'],['30–40 %','#b45309'],['20–30 %','#f59e0b'],['<20 %','#fef9c3']],
  libe:   [['≥2.0 %','#78350f'],['1.0–2.0 %','#b45309'],['0.5–1.0 %','#F9B000'],['<0.5 %','#fef3c7']],
  winner: [['KOK','#1a56c4'],['SDP','#E63946'],['VAS','#C41E3A'],['PS','#d4a800'],['VIHR','#2DC653']],
  all:    [['Korkea potentiaali','#20324c'],['Selvästi keskitason yläpuolella','#466b96'],['Keskitaso','#7ea4c6'],['Matala potentiaali','#d9e8f6'],['Väri = suurin puolue · tummempi = korkeampi kokonaispotentiaali','']],
};

export const SUBTITLES = {
  score:  'Väri = suurin puolue · tummempi = korkeampi potentiaali oikeistopoolissa',
  pool:   'Oikeistopooli = KOK + VIHR + RKP + LIIK',
  nukk:   'Nukkuvien osuus äänioikeutetuista',
  libe:   'LIBEn ääniosuus äänestäneistä',
  winner: 'Alueen eniten ääniä saanut puolue',
  all:    'Väri = suurin puolue · tummempi = korkeampi potentiaali kaikista puolueista + nukkuvista',
};

export const RANK_LABELS = {
  score:'oikeistopoolin potentiaalipisteet',
  pool:'oikeistopooli-%',
  nukk:'nukkuvat-%',
  libe:'LIBE-%',
  winner:'suurin puolue',
  all:'puolueet + nukkuvat -pisteet',
};
