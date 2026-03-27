// Shared scoring utilities used by both modes.js and socio-modes.js

export function sortNumeric(values) {
  return values.filter(Number.isFinite).sort((a, b) => a - b);
}

export function round1(value) {
  return Math.round(value * 10) / 10;
}

export function createPercentileRank(values, { invert = false } = {}) {
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
