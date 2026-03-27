#!/usr/bin/env node
// Fetch socioeconomic data from Tilastokeskus PAAVO (PxWeb API)
// Outputs public/data/paavo_socio.json with per-postal-code indicators

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://pxdata.stat.fi/PxWeb/api/v1/fi/Postinumeroalueittainen_avoin_tieto/uusin';
const YEAR = '2024';

// Read PKS postal codes from existing GeoJSON
const postiGeo = JSON.parse(readFileSync(join(__dirname, '../public/data/postinumero.json'), 'utf8'));
// 02290 does not exist in PAAVO tables — filter it out
const EXCLUDED = new Set(['02290']);
const PKS_CODES = [...new Set(postiGeo.features.map(f => f.properties.Posno))]
  .filter(c => !EXCLUDED.has(c))
  .sort();
console.log(`PKS postal codes: ${PKS_CODES.length}`);

async function queryTable(tableId, variables, year = YEAR) {
  const url = `${BASE}/paavo_pxt_${tableId}.px`;
  const body = {
    query: [
      { code: 'Postinumeroalue', selection: { filter: 'item', values: PKS_CODES } },
      { code: 'Tiedot', selection: { filter: 'item', values: variables } },
      { code: 'Vuosi', selection: { filter: 'item', values: [year] } },
    ],
    response: { format: 'json-stat2' },
  };

  console.log(`  Fetching ${tableId} (${variables.length} vars)...`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${tableId} failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();

  // Parse json-stat2: values are in row-major order [postal × variable × year]
  const values = data.value;
  const nVars = variables.length;
  const result = {};

  for (let i = 0; i < PKS_CODES.length; i++) {
    const code = PKS_CODES[i];
    result[code] = {};
    for (let j = 0; j < nVars; j++) {
      const val = values[i * nVars + j];
      result[code][variables[j]] = val === null || val === '...' ? null : val;
    }
  }

  return result;
}

async function main() {
  console.log('Fetching PAAVO data from Tilastokeskus...');

  // Fetch all 5 tables in parallel
  const [pop, edu, income, industry, activity] = await Promise.all([
    // 12ey: Population structure - age groups for working-age share
    queryTable('12ey', [
      'he_vakiy',  // Total population
      'he_25_29', 'he_30_34', 'he_35_39', 'he_40_44', 'he_45_49', 'he_50_54',
    ]),
    // 12ez: Education - higher education share
    queryTable('12ez', [
      'ko_ika18y',  // 18+ total
      'ko_al_kork', // Bachelor's / lower university degree
      'ko_yl_kork', // Master's / upper university degree
    ]),
    // 12f1: Income - median income, upper income bracket
    queryTable('12f1', [
      'hr_tuy',     // 18+ total (income base)
      'hr_mtu',     // Median income
      'hr_hy_tul',  // Upper income bracket count
    ]),
    // 12f5: Industry - knowledge-intensive services (J+K+M)
    // Note: 2024 data not yet available, use 2023
    queryTable('12f5', [
      'tp_tyopy',   // Total workplaces
      'tp_j_info',  // J: ICT
      'tp_k_raho',  // K: Finance & insurance
      'tp_m_erik',  // M: Professional, scientific, technical
    ], '2023'),
    // 12f6: Primary activity - employment rate, dependency
    queryTable('12f6', [
      'pt_vakiy',   // Total residents
      'pt_tyoll',   // Employed
      'pt_tyott',   // Unemployed
      'pt_0_14',    // Children 0-14
      'pt_elakel',  // Pensioners
    ]),
  ]);

  // Compute derived indicators per postal code
  const output = {};
  let validCount = 0;

  for (const code of PKS_CODES) {
    const p = pop[code];
    const e = edu[code];
    const inc = income[code];
    const ind = industry[code];
    const act = activity[code];

    const totalPop = p.he_vakiy;
    if (!totalPop || totalPop < 30) {
      // Skip areas with too few residents (data suppressed by Tilastokeskus)
      continue;
    }

    // 1. Working-age share (25-54)
    const workingAge = (p.he_25_29 || 0) + (p.he_30_34 || 0) + (p.he_35_39 || 0)
      + (p.he_40_44 || 0) + (p.he_45_49 || 0) + (p.he_50_54 || 0);
    const working_age_pct = totalPop > 0 ? (workingAge / totalPop) * 100 : null;

    // 2. Higher education share (bachelor + master / 18+)
    const edu18 = e.ko_ika18y || 0;
    const higherEdu = (e.ko_al_kork || 0) + (e.ko_yl_kork || 0);
    const higher_edu_pct = edu18 > 0 ? (higherEdu / edu18) * 100 : null;

    // 3. Median income
    const median_income = inc.hr_mtu;

    // 4. Upper income bracket share (of 18+ population)
    const incBase = inc.hr_tuy || 0;
    const upper_income_pct = incBase > 0 ? ((inc.hr_hy_tul || 0) / incBase) * 100 : null;

    // 5. Knowledge-intensive services share (J+K+M / total workplaces)
    const totalJobs = ind.tp_tyopy || 0;
    const knowledgeJobs = (ind.tp_j_info || 0) + (ind.tp_k_raho || 0) + (ind.tp_m_erik || 0);
    const knowledge_services_pct = totalJobs > 0 ? (knowledgeJobs / totalJobs) * 100 : null;

    // 6. Employment rate (employed / (employed + unemployed + students + pensioners + other))
    const employed = act.pt_tyoll || 0;
    const totalAct = act.pt_vakiy || 0;
    const children = act.pt_0_14 || 0;
    const adultPop = totalAct - children;
    const employment_rate = adultPop > 0 ? (employed / adultPop) * 100 : null;

    // 7. Dependency ratio (children 0-14 + pensioners) / total
    const pensioners = act.pt_elakel || 0;
    const dependency_ratio = totalAct > 0 ? ((children + pensioners) / totalAct) * 100 : null;

    output[code] = {
      population: totalPop,
      higher_edu_pct: higher_edu_pct != null ? Math.round(higher_edu_pct * 10) / 10 : null,
      median_income: median_income,
      upper_income_pct: upper_income_pct != null ? Math.round(upper_income_pct * 10) / 10 : null,
      knowledge_services_pct: knowledge_services_pct != null ? Math.round(knowledge_services_pct * 10) / 10 : null,
      working_age_pct: working_age_pct != null ? Math.round(working_age_pct * 10) / 10 : null,
      employment_rate: employment_rate != null ? Math.round(employment_rate * 10) / 10 : null,
      dependency_ratio: dependency_ratio != null ? Math.round(dependency_ratio * 10) / 10 : null,
    };
    validCount++;
  }

  const outPath = join(__dirname, '../public/data/paavo_socio.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`  ${validCount} postal areas with data (of ${PKS_CODES.length} total)`);

  // Print top 5 by higher_edu_pct for sanity check
  const sorted = Object.entries(output)
    .filter(([, v]) => v.higher_edu_pct != null)
    .sort(([, a], [, b]) => b.higher_edu_pct - a.higher_edu_pct);
  console.log('\nTop 5 by higher education %:');
  for (const [code, v] of sorted.slice(0, 5)) {
    console.log(`  ${code}: edu=${v.higher_edu_pct}%, income=${v.median_income}, knowledge=${v.knowledge_services_pct}%`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
