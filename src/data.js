export const DEFAULT_TOP_N = 5;
export const STORAGE_KEY = "minmaxer-state-react-v1";

export const MARKET_HUBS = [
  { id: "jita", name: "Jita", stationId: 60003760, regionId: 10000002 },
  { id: "amarr", name: "Amarr", stationId: 60008494, regionId: 10000043 },
  { id: "dodixie", name: "Dodixie", stationId: 60011866, regionId: 10000032 },
];

export const P0_TO_P1 = withDefaults({
  "Aqueous Liquids": { p1: "Water" },
  Autotrophs: { p1: "Industrial Fibers" },
  "Base Metals": { p1: "Reactive Metals" },
  "Carbon Compounds": { p1: "Biofuels" },
  "Complex Organisms": { p1: "Proteins" },
  "Felsic Magma": { p1: "Silicon" },
  "Heavy Metals": { p1: "Toxic Metals" },
  "Ionic Solutions": { p1: "Electrolytes" },
  Microorganisms: { p1: "Bacteria" },
  "Noble Gas": { p1: "Oxygen" },
  "Noble Metals": { p1: "Precious Metals" },
  "Non-CS Crystals": { p1: "Chiral Structures" },
  "Planktic Colonies": { p1: "Biomass" },
  "Reactive Gas": { p1: "Oxidizing Compound" },
  "Suspended Plasma": { p1: "Plasmoids" },
});

// Canonical P0 per planet type (kept at 5 entries max for consistent inputs).
export const PLANET_TYPES = {
  Barren: ["Aqueous Liquids", "Base Metals", "Carbon Compounds", "Microorganisms", "Noble Metals"],
  Temperate: ["Aqueous Liquids", "Autotrophs", "Carbon Compounds", "Complex Organisms", "Microorganisms"],
  Oceanic: ["Aqueous Liquids", "Carbon Compounds", "Complex Organisms", "Microorganisms", "Planktic Colonies"],
  Ice: ["Aqueous Liquids", "Heavy Metals", "Microorganisms", "Noble Gas", "Planktic Colonies"],
  Gas: ["Aqueous Liquids", "Base Metals", "Ionic Solutions", "Noble Gas", "Reactive Gas"],
  Storm: ["Aqueous Liquids", "Base Metals", "Ionic Solutions", "Noble Gas", "Suspended Plasma"],
  Lava: ["Base Metals", "Felsic Magma", "Heavy Metals", "Non-CS Crystals", "Suspended Plasma"],
  Plasma: ["Base Metals", "Heavy Metals", "Noble Metals", "Non-CS Crystals", "Suspended Plasma"],
};

export const P1_CATALOG = [
  { name: "Water", typeId: 3645, volume: 0.38, defaultPrice: 120, sampleHistory: [115, 117, 123, 130, 126, 124, 129, 134] },
  { name: "Industrial Fibers", typeId: 2397, volume: 0.38, defaultPrice: 220, sampleHistory: [210, 215, 225, 240, 238, 230, 228] },
  { name: "Reactive Metals", typeId: 2391, volume: 0.38, defaultPrice: 150, sampleHistory: [140, 145, 155, 150, 152, 160, 158] },
  { name: "Biofuels", typeId: 2396, volume: 0.38, defaultPrice: 160, sampleHistory: [150, 152, 158, 165, 170, 168, 166] },
  { name: "Proteins", typeId: 2395, volume: 0.38, defaultPrice: 190, sampleHistory: [180, 182, 190, 200, 198, 192, 189] },
  { name: "Silicon", typeId: 9828, volume: 0.38, defaultPrice: 240, sampleHistory: [230, 232, 238, 242, 245, 250, 248] },
  { name: "Toxic Metals", typeId: 2390, volume: 0.38, defaultPrice: 260, sampleHistory: [250, 252, 255, 260, 265, 270, 268] },
  { name: "Electrolytes", typeId: 2398, volume: 0.38, defaultPrice: 210, sampleHistory: [200, 202, 210, 215, 218, 212, 208] },
  { name: "Bacteria", typeId: 2393, volume: 0.38, defaultPrice: 110, sampleHistory: [100, 104, 108, 112, 115, 118, 116] },
  { name: "Biomass", typeId: 3779, volume: 0.38, defaultPrice: 180, sampleHistory: [170, 172, 180, 188, 186, 182, 179] },
  { name: "Oxygen", typeId: 3683, volume: 0.38, defaultPrice: 400, sampleHistory: [380, 390, 400, 415, 420, 410, 405] },
  { name: "Precious Metals", typeId: 2392, volume: 0.38, defaultPrice: 520, sampleHistory: [500, 510, 520, 540, 535, 528, 525] },
  { name: "Chiral Structures", typeId: 2400, volume: 0.38, defaultPrice: 350, sampleHistory: [330, 340, 345, 355, 360, 358, 352] },
  { name: "Plasmoids", typeId: 2389, volume: 0.38, defaultPrice: 430, sampleHistory: [420, 422, 428, 440, 438, 432, 430] },
  { name: "Oxidizing Compound", typeId: 2399, volume: 0.38, defaultPrice: 380, sampleHistory: [360, 370, 380, 395, 390, 388, 386] },
];

export const P1_INDEX = Object.fromEntries(P1_CATALOG.map((p) => [p.name, p]));

export async function fetchMarketData(hubId) {
  const hub = MARKET_HUBS.find((h) => h.id === hubId) || MARKET_HUBS[0];
  const ids = P1_CATALOG.filter((p) => p.typeId).map((p) => p.typeId).join(",");
  if (!ids) return buildSyntheticMarket();
  const url = `https://market.fuzzwork.co.uk/aggregates/?types=${ids}&station=${hub.stationId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Market fetch failed");
  const data = await res.json();

  // Fetch 60-day daily history from ESI per P1 (region scope).
  const historyResults = await Promise.all(
    P1_CATALOG.map(async (p1) => {
      if (!p1.typeId) return { name: p1.name, history: [] };
      try {
        const histRes = await fetch(
          `https://esi.evetech.net/latest/markets/${hub.regionId}/history/?type_id=${p1.typeId}`
        );
        if (!histRes.ok) throw new Error("History fetch failed");
        const hist = await histRes.json();
        const trimmed = hist
          .slice(-60)
          .map((d) => ({
            ts: new Date(d.date).getTime(),
            price: Math.round(d.average || d.lowest || d.highest || p1.defaultPrice),
          }))
          .filter((p) => p.price > 0);
        return { name: p1.name, history: trimmed };
      } catch (_err) {
        return { name: p1.name, history: [] };
      }
    })
  );
  const historyMap = Object.fromEntries(historyResults.map((h) => [h.name, h.history]));

  const prices = {};
  P1_CATALOG.forEach((p1) => {
    const market = data[p1.typeId];
    const sell = market?.sell?.min || market?.sell?.fivePercent || p1.defaultPrice;
    const buy = market?.buy?.max || market?.buy?.fivePercent || sell;
    const price = sell;
    const hist = historyMap[p1.name];
    prices[p1.name] = {
      price,
      buy,
      sell,
      history: hist?.length ? hist : buildFlatHistory(price, 60),
    };
  });
  return prices;
}

export function buildSyntheticMarket() {
  const prices = {};
  P1_CATALOG.forEach((p1) => {
    const jitter = 1 + (Math.random() - 0.5) * 0.1;
    const price = Math.round(p1.defaultPrice * jitter);
    prices[p1.name] = { price, buy: Math.round(price * 0.95), sell: price, history: buildHistory(price) };
  });
  return prices;
}

export function buildHistory(anchor = 1, length = 12) {
  const base = Number.isFinite(anchor) && anchor > 0 ? anchor : 1;
  const now = Date.now();
  const points = [];
  let current = base;
  for (let i = 0; i < length; i++) {
    current = Math.max(base * 0.6, Math.min(base * 1.4, current + (Math.random() - 0.5) * base * 0.05));
    points.push({ ts: now - (length - i) * 3600_000, price: Math.round(current) });
  }
  return points;
}

export function buildFlatHistory(price, length = 12) {
  const now = Date.now();
  const val = Math.round(price);
  return Array.from({ length }, (_v, i) => ({ ts: now - (length - i) * 3600_000, price: val }));
}

export function normalizeHistory(history, fallbackPrice = 1, length = 12) {
  if (!history || history.length === 0) return buildFlatHistory(fallbackPrice, length);
  // If history already objects with ts/price, keep them; if numbers, convert to dated points.
  if (typeof history[0] === "object" && history[0] !== null && "price" in history[0]) {
    return history;
  }
  const now = Date.now();
  return history.map((val, idx) => ({
    ts: now - (history.length - idx) * 3600_000,
    price: val,
  }));
}

export function mergePrices(existing = {}, incoming = {}, windowSize = 20) {
  const merged = {};
  const now = Date.now();
  P1_CATALOG.forEach((p1) => {
    const old = existing[p1.name];
    const inc = incoming[p1.name];
    const price = inc?.price ?? old?.price ?? p1.defaultPrice;
    const incomingHistory = normalizeHistory(inc?.history, price, windowSize);
    const oldHistory = normalizeHistory(old?.history, old?.price ?? p1.defaultPrice, windowSize);
    const base = incomingHistory.length ? incomingHistory : oldHistory;
    const newPoint = { ts: now, price: Math.round(price) };
    const history = [...base, newPoint].slice(-Math.max(windowSize, base.length + 1));
    merged[p1.name] = { price: Math.round(price), history };
  });
  return merged;
}

export function withDefaults(map) {
  const enriched = {};
  Object.entries(map).forEach(([p0, obj]) => {
    enriched[p0] = {
      p0PerP1: 3000,
      p1Yield: 20,
      ...obj,
    };
  });
  return enriched;
}

export const uuid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2) + Date.now();
