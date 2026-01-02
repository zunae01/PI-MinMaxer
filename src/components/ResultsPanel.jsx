import { rankSystems } from "../lib/scoring";
import { formatNumber } from "../utils/format";
import Sparkline from "./Sparkline";

export default function ResultsPanel({ session, onOpenPlanet, fullWidth = false }) {
  if (!session || session.systems.length === 0) {
    return (
      <section className={`panel results ${fullWidth ? "full" : ""}`}>
        <div className="empty-state">
          <div className="empty">
            <p>No data yet.</p>
            <p>Add systems and planets to see rankings.</p>
          </div>
        </div>
      </section>
    );
  }

  const ranked = rankSystems(session);

  return (
    <section className={`panel results ${fullWidth ? "full" : ""}`}>
      <div className="section-header">
        <div>
          <h2>{fullWidth ? "Analysis" : "Results"}</h2>
          <p className="hint">
            System score = sum of top 6 planets (best material only). Effective ISK/m³ = P1 ISK/m³ × abundance%.
          </p>
        </div>
      </div>
      <div className={`results-list ${fullWidth ? "wide" : ""}`}>
        {ranked.map((entry, idx) => (
          <div key={entry.system.id} className={`result-card ${idx === 0 ? "leader" : ""}`}>
            <header>
              <div>
                <div className="title">{entry.system.name}</div>
                <div className="session-meta">Rank #{idx + 1} · {entry.system.planets.length} planets</div>
              </div>
              <div className="score">
                System score: {formatNumber(entry.score)}
                <div className="meta">Top planet {formatNumber(entry.topPlanetScore)} ISK/m³</div>
              </div>
            </header>
            <div className="planet-breakdown">
            {entry.planetScores
              .sort((a, b) => b.best.value - a.best.value)
              .map((p, planetIdx) => {
                const recommended = planetIdx < 6;
                return (
                  <div
                    key={p.planet.id}
                    className={`planet-row ${recommended ? "recommended" : ""}`}
                    onClick={() => onOpenPlanet?.(p, entry.system)}
                  >
                    <header>
                      <div>
                        <div className="title">{p.planet.name}</div>
                        <div className="session-meta">{p.planet.type}</div>
                      </div>
                      <div className="chip">
                        {recommended ? "Top 6 · " : ""}
                        Best {p.best.p1} · {formatNumber(p.best.value)} ISK/m³
                      </div>
                    </header>
                    <div className="meta">
                      Best material: {p.best.p0} → {p.best.p1} · Abundance {p.best.abundance}% · P1 ISK/m³ {formatNumber(p.best.p1IskPerM3)}
                    </div>
                    <div className="sparkline">
                      <Sparkline points={(p.best.history || []).map((h) => (typeof h === "object" ? h.price : h))} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
    {fullWidth && (
        <div className="explanation">
          <h3>How we rank systems</h3>
          <p>
            Each planet is scored by its single best material: P1 ISK/m³ at the selected hub multiplied by your entered
            abundance percent. Systems are ranked by summing their best 6 planets (no diminishing weights).
          </p>
        </div>
      )}
    </section>
  );
}
