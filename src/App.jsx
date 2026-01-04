import { useEffect, useMemo, useState } from "react";
import SessionSidebar from "./components/SessionSidebar";
import BuilderPanel from "./components/BuilderPanel";
import ResultsPanel from "./components/ResultsPanel";
import Modal from "./components/Modal";
import Sparkline from "./components/Sparkline";
import PriceChart from "./components/PriceChart";
import { usePersistentState } from "./hooks/usePersistentState";
import {
  DEFAULT_TOP_N,
  MARKET_HUBS,
  PLANET_TYPES,
  P0_TO_P1,
  P1_INDEX,
  buildSyntheticMarket,
  fetchMarketData,
  uuid,
  buildHistory,
  mergePrices,
} from "./data";
import { formatNumber } from "./utils/format";

export default function App() {
  const [state, setState] = usePersistentState();
  const [activeSessionId, setActiveSessionId] = useState(state.lastSessionId || state.sessions[0]?.id || null);
  const [activeSystemId, setActiveSystemId] = useState(null);
  const [view, setView] = useState("builder");
  const [p1Modal, setP1Modal] = useState(null);
  const [planetModal, setPlanetModal] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);

  const activeSession = useMemo(
    () => state.sessions.find((s) => s.id === activeSessionId) || null,
    [state.sessions, activeSessionId]
  );

  useEffect(() => {
    if (activeSession && activeSession.systems[0] && !activeSystemId) {
      setActiveSystemId(activeSession.systems[0].id);
    }
  }, [activeSession, activeSystemId]);

  const createSession = (name) => {
    const session = {
      id: uuid(),
      name: name?.trim() || `Session ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      systems: [],
      settings: { priceMode: "sell" },
      marketHub: "jita",
      market: { prices: buildSyntheticMarket(), lastFetched: null },
    };
    setState((prev) => ({ ...prev, sessions: [session, ...prev.sessions], lastSessionId: session.id }));
    setActiveSessionId(session.id);
    setActiveSystemId(null);
  };

  const updateSession = (sessionId, mutate) => {
    setState((prev) => {
      const idx = prev.sessions.findIndex((s) => s.id === sessionId);
      if (idx === -1) return prev;
      const session = { ...prev.sessions[idx] };
      mutate(session);
      session.updatedAt = new Date().toISOString();
      const sessions = [...prev.sessions];
      sessions[idx] = session;
      return { ...prev, sessions };
    });
  };

  const deleteSession = (sessionId) => {
    setState((prev) => {
      const sessions = prev.sessions.filter((s) => s.id !== sessionId);
      const nextActive = sessionId === activeSessionId ? sessions[0]?.id || null : activeSessionId;
      setActiveSessionId(nextActive);
      setActiveSystemId(null);
      return { ...prev, sessions, lastSessionId: nextActive };
    });
  };

  const upsertSystem = (id, name) => {
    if (!activeSession) return;
    updateSession(activeSession.id, (session) => {
      const systems = [...session.systems];
      const idx = systems.findIndex((s) => s.id === id);
      if (idx >= 0) {
        systems[idx] = { ...systems[idx], name };
      } else {
        const newSystem = { id: uuid(), name, planets: [] };
        systems.push(newSystem);
        setActiveSystemId(newSystem.id);
      }
      session.systems = systems;
    });
  };

  const deleteSystem = (systemId) => {
    if (!activeSession) return;
    updateSession(activeSession.id, (session) => {
      session.systems = session.systems.filter((s) => s.id !== systemId);
    });
    if (activeSystemId === systemId) {
      setActiveSystemId(activeSession.systems[0]?.id || null);
    }
  };

  const upsertPlanet = (planetDraft) => {
    if (!activeSession) return;
    updateSession(activeSession.id, (session) => {
      const systems = [...session.systems];
      const sysIdx = systems.findIndex((s) => s.id === planetDraft.systemId);
      if (sysIdx === -1) return;
      const system = { ...systems[sysIdx] };
      const planets = [...system.planets];
      const idx = planets.findIndex((p) => p.id === planetDraft.id);
      const record = {
        id: planetDraft.id || uuid(),
        name: planetDraft.name,
        type: planetDraft.type,
        densities: planetDraft.densities,
      };
      if (idx >= 0) planets[idx] = record;
      else planets.push(record);
      system.planets = planets;
      systems[sysIdx] = system;
      session.systems = systems;
    });
    setActiveSystemId(planetDraft.systemId);
  };

  const deletePlanet = (systemId, planetId) => {
    if (!activeSession) return;
    updateSession(activeSession.id, (session) => {
      const systems = [...session.systems];
      const sysIdx = systems.findIndex((s) => s.id === systemId);
      if (sysIdx === -1) return;
      const system = { ...systems[sysIdx] };
      system.planets = system.planets.filter((p) => p.id !== planetId);
      systems[sysIdx] = system;
      session.systems = systems;
    });
  };

  const setTopN = (value) => {
    if (!activeSession) return;
    updateSession(activeSession.id, (session) => {
      session.settings.topN = value;
    });
  };

  const setMarketHub = (hubId) => {
    if (!activeSession) return;
    updateSession(activeSession.id, (session) => {
      session.marketHub = hubId;
    });
  };

  const setPriceMode = (mode) => {
    if (!activeSession) return;
    updateSession(activeSession.id, (session) => {
      session.settings.priceMode = mode;
    });
  };

  const refreshMarket = async () => {
    if (!activeSession) return;
    setMarketLoading(true);
    const hubId = activeSession.marketHub;
    try {
      const prices = await fetchMarketData(hubId);
      updateSession(activeSession.id, (session) => {
        if (session.marketHub !== hubId) return;
        const merged = mergePrices(session.market?.prices, prices);
        session.market = { prices: merged, lastFetched: new Date().toISOString(), hub: hubId };
      });
    } catch (err) {
      console.error(err);
      updateSession(activeSession.id, (session) => {
        if (!session.market) session.market = {};
        const fallback = mergePrices(session.market?.prices, buildSyntheticMarket());
        session.market.prices = fallback;
        session.market.lastFetched = session.market.lastFetched || null;
        session.market.hub = hubId;
      });
    } finally {
      setMarketLoading(false);
    }
  };

  const handleOpenP1 = (p1Name) => setP1Modal(p1Name);
  const handleCloseP1 = () => setP1Modal(null);
  const handleOpenPlanet = (planetScore, system) => setPlanetModal({ planetScore, system });
  const handleClosePlanet = () => setPlanetModal(null);

  const modalContent = p1Modal ? buildP1Modal(p1Modal, activeSession) : null;
  const planetModalContent = planetModal ? buildPlanetModal(planetModal, activeSession) : null;

  const exportSession = () => {
    if (!activeSession) return;
    const data = JSON.stringify(activeSession, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeSession.name || "session"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Auto-refresh market when hub changes; keep existing prices while fetching.
  useEffect(() => {
    if (!activeSession) return;
    let cancelled = false;
    const hubId = activeSession.marketHub;
    // Ensure we have some prices to show immediately.
    updateSession(activeSession.id, (session) => {
      if (!session.market) {
        session.market = { prices: buildSyntheticMarket(), lastFetched: null, hub: hubId };
      } else {
        session.market.prices = mergePrices(session.market.prices, session.market.prices);
      }
    });
    (async () => {
      setMarketLoading(true);
      try {
        const prices = await fetchMarketData(hubId);
        if (cancelled) return;
        updateSession(activeSession.id, (session) => {
          if (session.marketHub !== hubId) return;
          const merged = mergePrices(session.market?.prices, prices);
          session.market = { prices: merged, lastFetched: new Date().toISOString(), hub: hubId };
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          updateSession(activeSession.id, (session) => {
            if (!session.market) session.market = {};
            const fallback = mergePrices(session.market?.prices, buildSyntheticMarket());
            session.market.prices = fallback;
            session.market.lastFetched = session.market.lastFetched || null;
            session.market.hub = hubId;
          });
        }
      } finally {
        if (!cancelled) setMarketLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSession?.marketHub]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="orb" />
          <div>
            <div className="title">PI - Min Maxer</div>
            <div className="subtitle">PI system scout for P1 profitability</div>
          </div>
        </div>
        <div className="top-actions">
          <label className="hub-select">
            <span>Market hub</span>
            <select
              value={activeSession?.marketHub || "jita"}
              onChange={(e) => setMarketHub(e.target.value)}
              disabled={!activeSession}
            >
              {MARKET_HUBS.map((hub) => (
                <option key={hub.id} value={hub.id}>{hub.name}</option>
              ))}
            </select>
          </label>
          <label className="hub-select">
            <span>Price mode</span>
            <select
              value={activeSession?.settings?.priceMode || "sell"}
              onChange={(e) => setPriceMode(e.target.value)}
              disabled={!activeSession}
            >
              <option value="sell">Sell</option>
              <option value="buy">Buy</option>
            </select>
          </label>
          <button onClick={refreshMarket} disabled={!activeSession || marketLoading} className="accent">
            {marketLoading ? "Refreshing..." : "Refresh market"}
          </button>
          <button onClick={exportSession} disabled={!activeSession}>Export JSON</button>
          <div className="view-toggle">
            <button className={view === "builder" ? "accent" : ""} onClick={() => setView("builder")}>Build</button>
            <button className={view === "analysis" ? "accent" : ""} onClick={() => setView("analysis")}>Analysis</button>
          </div>
        </div>
      </header>

      <main className="layout">
        <SessionSidebar
          sessions={state.sessions}
          activeSessionId={activeSessionId}
          onCreate={createSession}
          onSelect={(id) => { setActiveSessionId(id); setState((prev) => ({ ...prev, lastSessionId: id })); }}
          onDelete={deleteSession}
        />

        <div className="content">
          {view === "builder" && (
            <>
              <BuilderPanel
                session={activeSession}
                activeSystemId={activeSystemId}
                setActiveSystemId={setActiveSystemId}
                onUpsertSystem={upsertSystem}
                onDeleteSystem={deleteSystem}
                onUpsertPlanet={upsertPlanet}
                onDeletePlanet={deletePlanet}
              />
              <ResultsPanel session={activeSession} onOpenP1={handleOpenP1} />
            </>
          )}
          {view === "analysis" && (
            <ResultsPanel session={activeSession} onOpenPlanet={handleOpenPlanet} fullWidth />
          )}
        </div>
      </main>

      <Modal open={!!planetModal} onClose={handleClosePlanet}>
        {planetModalContent}
      </Modal>
    </div>
  );
}

function buildP1Modal(p1Name, session) {
  const meta = P1_INDEX[p1Name];
  if (!meta) return null;
  const priceObj = session?.market?.prices?.[p1Name];
  const priceMode = session?.settings?.priceMode || "sell";
  const price = priceMode === "buy"
    ? priceObj?.buy ?? priceObj?.price ?? meta.defaultPrice
    : priceObj?.sell ?? priceObj?.price ?? meta.defaultPrice;
  const buy = priceObj?.buy ?? price;
  const sell = priceObj?.sell ?? price;
  const historyObjs = session?.market?.prices?.[p1Name]?.history?.length
    ? session.market.prices[p1Name].history
    : meta.sampleHistory?.length
      ? meta.sampleHistory.map((p, idx) => ({ ts: Date.now() - (meta.sampleHistory.length - idx) * 3600_000, price: p }))
      : buildHistory(price);
  const history = historyObjs.map((h) => (typeof h === "object" ? h.price : h));
  const labels = historyObjs.map((h) =>
    typeof h === "object" && h.ts ? new Date(h.ts).toLocaleString() : ""
  );
  const mapping = Object.entries(P0_TO_P1).find(([, v]) => v.p1 === p1Name);
  const p0Name = mapping ? mapping[0] : "Unknown";
  const recipe = mapping ? P0_TO_P1[p0Name] : { p0PerP1: 0, p1Yield: 0 };
  const iskPerM3 = price / (meta.volume || 1);
  return (
    <div className="modal-grid">
      <div className="modal-main">
        <h3>{p1Name}</h3>
        <p className="hint">Market at {session?.marketHub?.toUpperCase() || "hub"}.</p>
        <div className="meta">Sell: {sell} ISK · Buy: {buy} ISK · Volume: {meta.volume} m3 · ISK/m3: {iskPerM3.toFixed(1)}</div>
        <div className="meta">Refine recipe: {recipe.p0PerP1} units of {p0Name} → {recipe.p1Yield} units of {p1Name}</div>
        <div className="chart-area tall">
          <PriceChart points={historyObjs} labels={labels} />
        </div>
        <p className="hint">Window shows the latest {history.length} price samples (older on the left, latest on the right).</p>
      </div>
      <div className="modal-side">
        <h4>Source P0</h4>
        <div className="meta">{p0Name}</div>
        <div className="meta">P0 required per batch: {recipe.p0PerP1}</div>
        <div className="meta">P1 output per batch: {recipe.p1Yield}</div>
        <div className="meta">Notes: P0 market orders not fetched; valuation uses P1 buy/sell only.</div>
      </div>
    </div>
  );
}

function buildPlanetModal(planetModal, session) {
  const { planetScore, system } = planetModal;
  const marketPrices = session?.market?.prices || {};
  const best = planetScore.best;
  const bestPrice = marketPrices[best.p1];
  const bestHistory =
    bestPrice?.history?.length
      ? bestPrice.history
      : (best.history || []).map((h) => (typeof h === "object" ? h : { ts: Date.now(), price: h }));
  const labels = bestHistory.map((h) => (h.ts ? new Date(h.ts).toLocaleDateString() : ""));

  return (
    <div className="modal-grid">
      <div className="modal-main">
        <h3>{planetScore.planet.name}</h3>
        <p className="hint">System: {system.name} · Type: {planetScore.planet.type}</p>
        <div className="meta">Best material: {best.p0} → {best.p1}</div>
        <div className="meta">Abundance: {best.abundance}% · P1 ISK/m³: {best.p1IskPerM3.toFixed(1)} · Effective: {best.value.toFixed(1)} ISK/m³</div>
        <div className="chart-area tall">
          <PriceChart points={bestHistory} labels={labels} />
        </div>
        <p className="hint">Price history for {best.p1} (last {bestHistory.length} samples).</p>
        <div className="meta">Buy: {bestPrice?.buy ?? "-"} ISK · Sell: {bestPrice?.sell ?? "-"} ISK</div>
        <h4>All materials on this planet</h4>
        <div className="planet-materials">
          {planetScore.breakdown.map((m) => (
            <div key={m.p0} className="mat-row">
              <div>{m.p0} → {m.p1}</div>
              <div className="meta">Abundance {m.abundance}% · P1 ISK/m³ {m.p1IskPerM3.toFixed(1)} · Effective {m.effective.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="modal-side">
        <h4>Why this ranking?</h4>
        <div className="meta">We pick the single best material by effective ISK/m³ (P1 price × abundance).</div>
        <div className="meta">Planet score = {best.value.toFixed(1)} ISK/m³.</div>
      </div>
    </div>
  );
}
