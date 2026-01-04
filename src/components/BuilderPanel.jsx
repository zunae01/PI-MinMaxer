import { useEffect, useMemo, useRef, useState } from "react";
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
    const systemId = planetDraft.systemId;
    const autoName = autoNameForSystem(systems, systemId);
    const name = (planetDraft.manualName ? planetDraft.name : autoName || "").trim();
    if (!name || !systemId || !planetDraft.type) return;
    onUpsertPlanet({ ...planetDraft, name });
    setPlanetDraft(blankPlanetDraft(systemId));
  };

  const p0List = PLANET_TYPES[planetDraft.type] || [];

  useEffect(() => {
    // Reset densities when type changes to avoid stale P0 keys.
    if (!planetDraft.type) return;
    const next = {};
    (PLANET_TYPES[planetDraft.type] || []).forEach((p0) => {
      next[p0] = planetDraft.densities[p0] ?? 0;
    });
    setPlanetDraft((prev) => ({ ...prev, densities: next }));
  }, [planetDraft.type]);

  // Keep planet system selection synced to active system when not editing an existing planet.
  useEffect(() => {
    if (!planetDraft.id && activeSystemId) {
      setPlanetDraft((prev) => {
        const name = prev.manualName ? prev.name : autoNameForSystem(session?.systems, activeSystemId);
        return { ...prev, systemId: activeSystemId, name };
      });
    }
  }, [activeSystemId, planetDraft.id, planetDraft.manualName, session?.systems]);

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
                  <input
                    value={planetDraft.name}
                    onChange={(e) => setPlanetDraft((p) => ({ ...p, name: e.target.value }))}
                    required
                    disabled={!planetDraft.manualName}
                  />
                  <label className="meta" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={planetDraft.manualName}
                      onChange={(e) =>
                        setPlanetDraft((p) => {
                          const manual = e.target.checked;
                          return manual
                            ? { ...p, manualName: true }
                            : { ...p, manualName: false, name: autoNameForSystem(systems, p.systemId) };
                        })
                      }
                    />
                    Manual name (auto: {autoNameForSystem(systems, planetDraft.systemId) || "—"})
                  </label>
                </label>
                <label>Planet type
                  <select
                    value={planetDraft.type}
                    onChange={(e) => setPlanetDraft((p) => ({ ...p, type: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select type</option>
                    {Object.keys(PLANET_TYPES).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label>Assign to system
                  <select
                    value={planetDraft.systemId || activeSystemId || ""}
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
                {planetDraft.type
                  ? p0List.map((p0) => (
                      <DensityInput
                        key={p0}
                        labelLeft={p0}
                        labelRight={P0_TO_P1[p0]?.p1}
                        value={planetDraft.densities[p0] ?? 0}
                        max={100}
                        onChange={(val) =>
                          setPlanetDraft((p) => ({
                            ...p,
                            densities: { ...p.densities, [p0]: val },
                          }))
                        }
                      />
                    ))
                  : <div className="hint">Select a planet type to enter densities.</div>}
              </div>
              <div className="form-actions">
                <button className="accent" type="submit">{planetDraft.id ? "Update planet" : "Add planet to System"}</button>
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
  return { id: null, name: "", type: "", systemId, densities: {}, manualName: false };
}

function DensityInput({ labelLeft, labelRight, value, max = 100, onChange }) {
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, value: 0 });

  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const handleMouseDown = (e) => {
    setDragging(true);
    start.current = { x: e.clientX, value: value || 0 };
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => {
      const dx = e.clientX - start.current.x;
      const delta = dx * (max / 150); // ~150px drag covers full range
      const next = Math.min(max, Math.max(0, start.current.value + delta));
      onChange(Math.round(next));
    };
    const up = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging, max, onChange]);

  return (
    <div className="p0-field density-field">
      <label>
        <span>{labelLeft}</span>
        <span>{labelRight}</span>
      </label>
      <input
        type="number"
        min="0"
        max={max}
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        onMouseDown={handleMouseDown}
        style={{
          background: `linear-gradient(90deg, rgba(45,226,230,0.25) ${pct}%, rgba(16,24,43,0.6) ${pct}%)`,
        }}
      />
    </div>
  );
}

function autoNameForSystem(systems = [], systemId) {
  if (!systemId) return "";
  const sys = systems.find((s) => s.id === systemId);
  if (!sys) return "";
  const nextIndex = (sys.planets?.length || 0) + 1;
  return `${sys.name} ${toRoman(nextIndex)}`;
}

function toRoman(num) {
  if (!num || num < 1) return "";
  const vals = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let res = "";
  let n = Math.floor(num);
  for (const [v, sym] of vals) {
    while (n >= v) {
      res += sym;
      n -= v;
    }
  }
  return res;
}
