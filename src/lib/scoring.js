import { PLANET_TYPES, P0_TO_P1, P1_INDEX, normalizeHistory } from "../data";

// Planet scoring: only the single best material counts. EffectiveValue = P1 ISK/m3 * (abundance% / 100).
export function calculatePlanetBest(planet, prices = {}) {
  const p0List = PLANET_TYPES[planet.type] || Object.keys(planet.densities || {});
  const breakdown = [];
  let best = { p0: null, p1: null, value: 0, abundance: 0, p1IskPerM3: 0, history: [] };

  p0List.forEach((p0) => {
    const mapping = P0_TO_P1[p0];
    if (!mapping) return;
    const p1Meta = P1_INDEX[mapping.p1];
    const price = prices[mapping.p1]?.price ?? p1Meta?.defaultPrice ?? 0;
    const volume = p1Meta?.volume || 1;
    const p1IskPerM3 = price / volume;
    const abundance = planet.densities?.[p0] || 0;
    const factor = abundance / 100;
    const effective = p1IskPerM3 * factor;
    const history = normalizeHistory(prices[mapping.p1]?.history, price || p1Meta?.defaultPrice || 1);

    const entry = { p0, p1: mapping.p1, abundance, p1IskPerM3, effective, history };
    breakdown.push(entry);
    if (effective > best.value) {
      best = { p0, p1: mapping.p1, value: effective, abundance, p1IskPerM3, history };
    }
  });

  return { planet, best, breakdown };
}

// Systems ranked by sum of top 6 planets' best values.
export function rankSystems(session) {
  const marketPrices = session?.market?.prices || {};
  const topN = 6;

  return (session?.systems || [])
    .map((system) => {
      const planetScores = system.planets.map((p) => calculatePlanetBest(p, marketPrices));
      const sorted = [...planetScores].sort((a, b) => b.best.value - a.best.value);
      const topSlice = sorted.slice(0, topN);
      const score = topSlice.reduce((acc, p) => acc + p.best.value, 0);
      return {
        system,
        planetScores: sorted,
        score,
        topPlanetScore: sorted[0]?.best.value || 0,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export const formatNumber = (num) => {
  if (!Number.isFinite(num)) return "-";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}b`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}m`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toFixed(1);
};
