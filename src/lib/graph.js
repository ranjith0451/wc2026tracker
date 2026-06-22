// Lightweight graph query layer over public/data/graph.json.
// Loaded once and cached at module scope. No external deps.

let cache = null;
let inflight = null;

export async function loadGraph() {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetch("/data/graph.json")
    .then(r => {
      if (!r.ok) throw new Error(`graph fetch failed: ${r.status}`);
      return r.json();
    })
    .then(g => {
      cache = g;
      inflight = null;
      return g;
    })
    .catch(err => {
      inflight = null;
      throw err;
    });
  return inflight;
}

export function nodesByType(graph, type) {
  const ids = graph.byType?.[type] || [];
  const idx = new Map(graph.nodes.map(n => [n.id, n]));
  return ids.map(id => idx.get(id)).filter(Boolean);
}

export function neighbors(graph, nodeId, edgeType) {
  const adj = graph.adjacency?.[nodeId] || [];
  return adj.filter(a => !edgeType || a.type === edgeType);
}

export function topScorers(graph, gender) {
  return nodesByType(graph, "Player")
    .filter(p => p.gender === gender)
    .sort((a, b) => (b.goals || 0) - (a.goals || 0));
}
