import * as d3 from 'd3';
import { createPercentileRank, round1 } from './score-utils.js';

// Weights for socioeconomic score components
const WEIGHTS = {
  higher_edu_pct: 0.22,
  median_income: 0.18,
  upper_income_pct: 0.12,
  knowledge_services_pct: 0.15,
  working_age_pct: 0.13,
  employment_rate: 0.12,
  dependency_ratio: 0.08, // inverted
};

const INDICATOR_LABELS = {
  higher_edu_pct: 'Korkeakoulutetut',
  median_income: 'Mediaanitulot',
  upper_income_pct: 'Ylin tuloluokka',
  knowledge_services_pct: 'Tietoint. palvelut (J+K+M)',
  working_age_pct: 'Työikäiset 25–54',
  employment_rate: 'Työllisyysaste',
  dependency_ratio: 'Huoltosuhde',
};

const INDICATOR_UNITS = {
  higher_edu_pct: '%',
  median_income: '€',
  upper_income_pct: '%',
  knowledge_services_pct: '%',
  working_age_pct: '%',
  employment_rate: '%',
  dependency_ratio: '%',
};

export { INDICATOR_LABELS, INDICATOR_UNITS };

// Color scale for socioeconomic score (gold → dark blue, matching LIBE brand)
const socioColor = d3.scaleLinear()
  .domain([20, 40, 60, 80])
  .range(['#fef3c7', '#F9B000', '#1d4ed8', '#172554'])
  .clamp(true);

export function getSocioColor(score) {
  if (score == null) return '#2d333b';
  return socioColor(score);
}

export function computeSocioScores(socioData, electionScores) {
  const codes = Object.keys(socioData);
  if (!codes.length) return {};

  // Build percentile rankers for each indicator
  const rankers = {};
  for (const key of Object.keys(WEIGHTS)) {
    const values = codes.map(c => socioData[c][key]).filter(Number.isFinite);
    rankers[key] = createPercentileRank(values, { invert: key === 'dependency_ratio' });
  }

  const result = {};
  for (const code of codes) {
    const d = socioData[code];

    // Compute socio sub-score
    let socioScore = 0;
    const components = {};
    for (const [key, weight] of Object.entries(WEIGHTS)) {
      const raw = d[key];
      const rank = rankers[key](raw);
      components[key] = { raw, rank: round1(rank * 100), weight };
      socioScore += weight * rank;
    }
    socioScore = round1(socioScore * 100);

    // Election sub-score (from existing postal area aggregation)
    const electionScore = electionScores[code] != null ? round1(electionScores[code]) : null;

    // Combined score (50/50 blend)
    const combinedScore = electionScore != null
      ? round1(0.5 * electionScore + 0.5 * socioScore)
      : socioScore;

    result[code] = {
      socio_score: socioScore,
      election_score: electionScore,
      combined_score: combinedScore,
      components,
      population: d.population,
    };
  }

  return result;
}

export const SOCIO_LEGEND_ITEMS = [
  ['Korkea potentiaali', '#172554'],
  ['Selvästi keskitason yläpuolella', '#1d4ed8'],
  ['Keskitaso', '#F9B000'],
  ['Matala potentiaali', '#fef3c7'],
  ['Tummempi = korkeampi sosioekonominen konversiopotentiaali', ''],
];
