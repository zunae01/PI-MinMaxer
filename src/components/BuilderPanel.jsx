import { useEffect, useMemo, useState } from "react";
import { PLANET_TYPES, P0_TO_P1 } from "../data";

export default function BuilderPanel({
  session,
  activeSystemId,
  setActiveSystemId,
  onUpsertSystem,
  onDeleteSystem,
  onUpsertPlanet,
  onDeletePlanet,
}) {
  const [systemDraft, setSystemDraft] = useState({ id: null, name: "" });
  const [planetDraft, setPlanetDraft] = useState(() => blankPlanetDraft());

  useEffect(() => {
    if (session?.systems?.length && !activeSystemId) {
      setActiveSystemId(session.systems[0].id);
    }
  }, [session, activeSystemId, setActiveSystemId]);

  const activeSystem = useMemo(
    () => session?.systems?.find((s) => s.id === activeSystemId) || null,
    [session, activeSystemId]
  );

  const systems = session?.systems || [];

  const handleSystemSubmit = (e) => {
    e.preventDefault();
    const name = systemDraft.name.trim();
    if (!name) return;
    onUpsertSystem(systemDraft.id, name);
    setSystemDraft({ id: null, name: "" });
  };

  const handlePlanetSubmit = (e) => {
    e.preventDefault();
    const name = planetDraft.name.trim();
    if (!name || !planetDraft.systemId) return;
    onUpsertPlanet(planetDraft);
    setPlanetDraft(blankPlanetDraft(planetDraft.systemId));
  };

  const p0List = PLANET_TYPES[planetDraft.type] || [];

  useEffect(() => {
    // Reset densities when type changes to avoid stale P0 keys.
    const next = {};
    (PLANET_TYPES[planetDraft.type] || []).forEach((p0) => {
      next[p0] = planetDraft.densities[p0] ?? 0;
    });
    setPlanetDraft((prev) => ({ ...prev, densities: next }));
  }, [planetDraft.type]);

  return (
    <section className="panel workspace">
      <div className="section-header">
        <div>
          <h2>Build</h2>
          <p className="hint">Add systems → add planets → enter densities. Results update automatically.</p>
        </div>
      </div>
      {!session && (
        <div className="empty-state">
          <div className="empty">
            <p>Select or create a session first.</p>
          </div>
        </div>
      )}
      {session && (
        <div className="builder-grid">
          <div className="card">
            <div className="card-title">Systems</div>
            <form className="inline-form" onSubmit={handleSystemSubmit}>
              <input
                value={systemDraft.name}
                onChange={(e) => setSystemDraft((s) => ({ ...s, name: e.target.value }))}
                placeholder="System name"
              />
              <button className="accent" type="submit">{systemDraft.id ? "Update" : "Add"} system</button>
              {systemDraft.id && (
                <button type="button" className="ghost" onClick={() => setSystemDraft({ id: null, name: "" })}>
                  Cancel
                </button>
              )}
            </form>
            <div className="pill-list">
              {systems.length === 0 && <div className="hint">No systems yet.</div>}
              {systems.map((sys) => (
                <div key={sys.id} className={`pill ${sys.id === activeSystemId ? "active" : ""}`}>
                  <button onClick={() => setActiveSystemId(sys.id)}>{sys.name}</button>
                  <span className="count">({sys.planets.length} planets)</span>
                  <div className="actions">
                    <button
                      onClick={() => setSystemDraft({ id: sys.id, name: sys.name })}
                      title="Edit system"
                    >
                      Edit
                    </button>
                    <button onClick={() => onDeleteSystem(sys.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Planets</div>
            <form className="planet-form" onSubmit={handlePlanetSubmit}>
              <div className="stack">
                <label>Name
                  <input value={planetDraft.name} onChange={(e) => setPlanetDraft((p) => ({ ...p, name: e.target.value }))} required />
                </label>
                <label>Planet type
                  <select value={planetDraft.type} onChange={(e) => setPlanetDraft((p) => ({ ...p, type: e.target.value }))}>
                    {Object.keys(PLANET_TYPES).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label>Assign to system
                  <select
                    value={planetDraft.systemId || ""}
                    onChange={(e) => setPlanetDraft((p) => ({ ...p, systemId: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select system</option>
                    {systems.map((sys) => (
                      <option key={sys.id} value={sys.id}>{sys.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="p0-inputs">
                {p0List.map((p0) => (
                  <div key={p0} className="p0-field">
                    <label>
                      <span>{p0}</span>
                      <span>{P0_TO_P1[p0]?.p1}</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="1"
                      value={planetDraft.densities[p0] ?? 0}
                      onChange={(e) =>
                        setPlanetDraft((p) => ({
                          ...p,
                          densities: { ...p.densities, [p0]: Number(e.target.value) || 0 },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="form-actions">
                <button className="accent" type="submit">{planetDraft.id ? "Update planet" : "Save planet"}</button>
                {planetDraft.id && (
                  <button type="button" className="ghost" onClick={() => setPlanetDraft(blankPlanetDraft(activeSystemId))}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <div className="planet-list">
              {activeSystem && activeSystem.planets.map((planet) => (
                <div key={planet.id} className="planet-card">
                  <header>
                    <div>
                      <div className="title">{planet.name}</div>
                      <div className="session-meta">{planet.type}</div>
                    </div>
                    <div className="actions">
                      <button onClick={() => setPlanetDraft({ ...planet, systemId: activeSystem.id })}>Edit</button>
                      <button onClick={() => onDeletePlanet(activeSystem.id, planet.id)}>Delete</button>
                    </div>
                  </header>
                  <div className="session-meta">
                    {Object.entries(planet.densities)
                      .map(([p0, val]) => `${p0}: ${val}`)
                      .join(" · ")}
                  </div>
                </div>
              ))}
              {!activeSystem && <div className="hint">Select a system to manage planets.</div>}
              {activeSystem && activeSystem.planets.length === 0 && <div className="hint">No planets yet.</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function blankPlanetDraft(systemId = "") {
  const firstType = Object.keys(PLANET_TYPES)[0];
  const densities = {};
  (PLANET_TYPES[firstType] || []).forEach((p0) => (densities[p0] = 0));
  return { id: null, name: "", type: firstType, systemId, densities };
}
