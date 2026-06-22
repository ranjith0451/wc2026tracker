// Builds public/data/graph.json from existing JSON sources.
// Pure transform — does not mutate source files. Safe to re-run.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dataDir = resolve(root, "public", "data");

const players = JSON.parse(readFileSync(resolve(dataDir, "players.json"), "utf8"));
const history = JSON.parse(readFileSync(resolve(dataDir, "history-v2.json"), "utf8"));

const nodes = [];
const edges = [];
const seen = new Set();

function addNode(node) {
  if (seen.has(node.id)) return;
  seen.add(node.id);
  nodes.push(node);
}

function addEdge(source, target, type, attrs = {}) {
  edges.push({ source, target, type, ...attrs });
}

function ingestGender(gender, scorerList, tournamentList) {
  for (const t of tournamentList || []) {
    const tid = `tournament:${gender}:${t.year}`;
    addNode({
      id: tid,
      type: "Tournament",
      gender,
      year: t.year,
      name: t.name,
      host: t.host,
      winner: t.winner,
      runnerUp: t.runnerUp,
      teams: t.teams,
      matches: t.matches,
      goals: t.goals,
      attendance: t.attendance,
    });

    if (t.host) {
      const hid = `team:${t.host}`;
      addNode({ id: hid, type: "Team", name: t.host });
      addEdge(hid, tid, "HOSTED");
    }
    if (t.winner) {
      const wid = `team:${t.winner}`;
      addNode({ id: wid, type: "Team", name: t.winner });
      addEdge(wid, tid, "WON");
    }
    if (t.runnerUp) {
      const rid = `team:${t.runnerUp}`;
      addNode({ id: rid, type: "Team", name: t.runnerUp });
      addEdge(rid, tid, "RUNNER_UP");
    }

    const groups = t.groups || {};
    for (const [groupName, teams] of Object.entries(groups)) {
      for (const team of teams) {
        const teamId = `team:${team}`;
        addNode({ id: teamId, type: "Team", name: team });
        addEdge(teamId, tid, "PLAYED_IN", { group: groupName });
      }
    }
  }

  for (const p of scorerList || []) {
    const pid = `player:${p.player_id || p.name}`;
    addNode({
      id: pid,
      type: "Player",
      gender,
      name: p.name,
      family: p.family,
      given: p.given,
      goals: p.goals,
      nonPenGoals: p.nonPenGoals,
      penGoals: p.penGoals,
      ownGoals: p.ownGoals,
      tournaments: p.tournaments || [],
    });

    for (const year of p.tournaments || []) {
      const tid = `tournament:${gender}:${year}`;
      addEdge(pid, tid, "PLAYED_IN");
    }
  }
}

ingestGender("men", players.men?.topScorers, history.men?.tournaments);
ingestGender("women", players.women?.topScorers, history.women?.tournaments);

// Indexes for fast lookups on the client.
const byType = {};
for (const n of nodes) {
  (byType[n.type] ||= []).push(n.id);
}

const adjacency = {};
for (const e of edges) {
  (adjacency[e.source] ||= []).push({ target: e.target, type: e.type });
  (adjacency[e.target] ||= []).push({ source: e.source, type: e.type, inverse: true });
}

const graph = {
  generated: new Date().toISOString(),
  meta: {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    sources: ["players.json", "history-v2.json"],
  },
  nodes,
  edges,
  byType,
  adjacency,
};

const out = resolve(dataDir, "graph.json");
writeFileSync(out, JSON.stringify(graph));
console.log(`graph.json written: ${nodes.length} nodes, ${edges.length} edges -> ${out}`);
