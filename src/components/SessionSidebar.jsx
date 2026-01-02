import { useState } from "react";
import { formatDate } from "../utils/format";

export default function SessionSidebar({ sessions, activeSessionId, onCreate, onSelect, onDelete }) {
  const [name, setName] = useState("");

  return (
    <aside className="panel sessions">
      <div className="panel-header">
        <div>
          <h2>Sessions</h2>
          <p className="hint">Local-only, auto-saved. Select a session to work on it.</p>
        </div>
        <div className="session-create">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional name" />
          <button className="accent" onClick={() => { onCreate(name); setName(""); }}>Create</button>
        </div>
      </div>
      <div className="session-list">
        {sessions.length === 0 && (
          <div className="empty-state">
            <div className="empty">
              <p>No sessions yet.</p>
              <p>Create one to start mapping systems.</p>
            </div>
          </div>
        )}
        {sessions.map((s) => (
          <div key={s.id} className={`session-card ${s.id === activeSessionId ? "active" : ""}`}>
            <button className="session-body" onClick={() => onSelect(s.id)}>
              <div className="title">{s.name}</div>
              <div className="session-meta">
                Systems: {s.systems.length} · Planets: {countPlanets(s)} · Updated: {formatDate(s.updatedAt)}
              </div>
            </button>
            <div className="session-actions">
              <button className="ghost" onClick={() => onSelect(s.id)}>Open</button>
              <button className="ghost" onClick={() => onDelete(s.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

const countPlanets = (session) => session.systems.reduce((acc, sys) => acc + sys.planets.length, 0);
