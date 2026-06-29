import { lazy, Suspense, useEffect, useState } from "react";
import { loadGraph, nodesByType, neighbors } from "../lib/graph";
import { MotionPage } from "../components/MotionPage";
import { prefersReducedMotion } from "../lib/usePlatform";

const GraphCanvas = lazy(() => import("../components/GraphCanvas"));

function canRender3D() {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return false;
  if ((navigator.hardwareConcurrency || 4) < 4) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

function FallbackList({ graph }) {
  const tournaments = nodesByType(graph, "Tournament")
    .sort((a, b) => a.year - b.year);
  return (
    <div style={{ padding: 20 }}>
      <p style={{ color: "var(--text-tertiary)", marginBottom: 16, fontSize: 13 }}>
        3D view unavailable on this device — showing flat graph summary.
      </p>
      {tournaments.map(t => {
        const players = neighbors(graph, t.id, "PLAYED_IN").filter(n => n.source?.startsWith("player:"));
        return (
          <div key={t.id} style={{ padding: "10px 14px", marginBottom: 6, background: "var(--bg-secondary)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <strong>{t.year} {t.gender === "women" ? "♀" : ""}</strong> {t.host} → {t.winner}
            <span style={{ color: "var(--text-tertiary)", marginLeft: 8, fontSize: 12 }}>
              {players.length} top scorers in graph
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Explore() {
  const [graph, setGraph] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadGraph().then(setGraph).catch(() => {});
  }, []);

  if (!graph) {
    return (
      <MotionPage>
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-tertiary)" }}>
          <div className="flp-spinner" style={{ margin: "0 auto 12px" }} />
          Loading knowledge graph…
        </div>
      </MotionPage>
    );
  }

  const enable3D = canRender3D();
  const selectedNeighbors = selected
    ? neighbors(graph, selected.id).map(n => {
        const id = n.target || n.source;
        return graph.nodes.find(x => x.id === id);
      }).filter(Boolean)
    : [];

  return (
    <MotionPage>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 6 }}>
          Explore the Knowledge Graph
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14, maxWidth: 720, lineHeight: 1.6 }}>
          {graph.meta?.nodeCount} nodes · {graph.meta?.edgeCount} edges. Tournaments arranged by year on a ring; top scorers orbit their tournaments. Drag to rotate. Click a node to inspect its connections.
        </p>
      </div>

      <div className="glass-surface specular" style={{ height: 560, position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
        {enable3D ? (
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading 3D view…</div>}>
            <GraphCanvas graph={graph} onSelect={setSelected} selectedId={selected?.id} />
          </Suspense>
        ) : (
          <FallbackList graph={graph} />
        )}
      </div>

      {selected && (
        <div className="glass-surface" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{selected.type}</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{selected.name || selected.year}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ color: 'var(--text-secondary)', padding: 6 }}>✕</button>
          </div>
          {selected.type === 'Tournament' && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <div>Year: <strong>{selected.year}</strong> {selected.gender === 'women' ? '· Women' : '· Men'}</div>
              <div>Host: <strong>{selected.host}</strong></div>
              <div>Winner: <strong>{selected.winner}</strong> · Runner-up: {selected.runnerUp}</div>
              <div>{selected.teams} teams · {selected.matches} matches · {selected.goals} goals</div>
            </div>
          )}
          {selected.type === 'Player' && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <div><strong>{selected.goals}</strong> goals ({selected.penGoals || 0} penalties) · {selected.gender === 'women' ? "Women's" : "Men's"} WC</div>
              <div>Tournaments: {(selected.tournaments || []).join(', ')}</div>
            </div>
          )}
          {selected.type === 'Team' && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>National team</div>
          )}
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>
            {selectedNeighbors.length} connection{selectedNeighbors.length === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </MotionPage>
  );
}
