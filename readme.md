## Min Maxer — Requirements Specification

### 1. Purpose & Goal
- Recommend the best solar systems and planets for Planetary Interaction (PI) based on user-observed P0 densities and P1 market prices.
- Focus on P1 value potential: high P0 density only matters if its resulting P1 is valuable.

### 2. Scope
- Stand-alone single-page web app; offline-first except for fetching EVE static data and market prices.
- Local-only persistence (e.g., `localStorage`); no auth or external integrations.

### 3. Core Concepts
- **Session:** A recording of systems, planets, and densities; all results are session-scoped.
- **System:** Solar system container for planets.
- **Planet:** Holds name, type, and P0 densities auto-derived from type.
- **P0 Resource:** Raw PI material tied to planet types.
- **P1 Material:** Refined material produced from P0; basis for valuation.
- **Resource Density:** User-entered numeric indicator (e.g., 0–100) for P0 availability.
- **Profitability Index:** Relative score ranking systems/planets by P1 value potential.

### 4. High-Level Workflow
1. User sees list of previous sessions.
2. Create new session (optional name; auto-generate if blank).
3. Within session: add systems → add planets → select type → enter densities for auto-listed P0s.
4. Repeat across systems/planets.
5. Open Results view to compare systems and planets.
6. Data persists locally; multiple sessions supported; last active session reopens on reload.

### 5. Functional Requirements
#### 5.1 Session Management
- Create/open/delete sessions (with confirmation on delete); auto-name if missing.
- Session list shows name, created/updated dates, system count, planet count.
- Persist all session data locally.

#### 5.2 Systems
- Add multiple systems per session; each has name and ID.
- Edit/rename; delete removes contained planets.

#### 5.3 Planets & Densities
- Add planet within a system with name and type (dropdown).
- Planet type auto-derives the P0 list; user enters numeric density per P0.
- Planets can be saved, edited, or deleted.

#### 5.4 Market Data (P1)
- User selects a market hub (e.g., Jita, Amarr, Dodixie).
- Fetch and cache sell prices for all P1 materials; allow manual refresh.
- Store per P1: id, name, icon ref, volume (m³), current sell price, optional price history for sparkline.

#### 5.5 Mapping & Profitability Logic
- Maintain/fetch mapping from each P0 to its P1 outputs and P0-per-P1 conversion amounts.
- **Planet profitability:** derived from entered P0 densities, mapped P1 outputs, and current P1 prices.
- **System profitability:** sum of the top N planet scores in that system (default N = 3 or 5); prioritizes systems with multiple strong planets.
- Variety of materials is not required for scoring.

### 6. Results View
- System ranking with name, profitability index, planet count, and quick strong-planet indicator.
- Expandable planet breakdown: name, type, icon, profitability index, and P1 contribution list (icon/name, percent/bar, current price, sparkline).
- Comparative analysis across all systems in the session.
- Sorting: systems by profitability (default descending); planets within systems by score.

### 7. P1 Details Modal
- Shows P1 icon, name, description (if available), current sell price, unit volume (m³), ISK per m³, required P0s and quantities, larger sparkline, and brief ISK-per-m³ rationale.
- Close via buttons or outside click.

### 8. Persistence
- All data stored locally; warn clearly if local storage unavailable.
- Reopen last active session on app reload when possible.

### 9. UX Requirements
- Clear linear flow: Add System → Add Planet → Next → View Results.
- P0 lists are always derived from planet type (never manual selection).
- Provide tooltips explaining scores/concepts.
- EVE-like darker theme; results readable at a glance.

### 10. Non-Functional Requirements
- Offline except for EVE static data and market price fetches.
- Instant performance up to ~100 planets per session.
- Code structured for future feature additions; desktop-first design.

### 11. Out of Scope (v1)
- ISK/hour calculators; taxes/POCO tariffs/export costs; P2–P4 chains; multi-user/cloud sync; logistics route planning.

## Getting Started (React/Vite)

```
npm install
npm run dev
```

The app stores everything in `localStorage`. Sessions contain systems and planets with P0 densities, fetch P1 prices per selected hub, and compute a PI Index per system (sum of top-N planets). Use the Analysis view for a full-width ranking of all systems.
