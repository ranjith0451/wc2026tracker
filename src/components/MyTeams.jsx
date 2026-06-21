/**
 * MyTeams — pinned section on Home showing followed teams' next/live matches.
 * Hidden entirely when no favorites are set.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useFavorites } from "../lib/favorites.js";
import { MATCHES } from "../data/matches.js";
import { getMatchStatus } from "../lib/time.js";
import TeamFlag from "./TeamFlag.jsx";
import FavoriteButton from "./FavoriteButton.jsx";
import { staggerContainer, revealUp } from "../lib/motion.js";

function findNextMatch(team, results) {
  // Find the next un-finished match where team is home or away (by team.name)
  // Only direct group-stage matches have type:"team" — knockout teams resolve later.
  const future = MATCHES.filter(m => {
    if (m.home?.type !== "team" && m.away?.type !== "team") return false;
    const isInvolved = m.home?.name === team || m.away?.name === team;
    if (!isInvolved) return false;
    const status = getMatchStatus(m, results);
    return status === "scheduled" || status === "live";
  });
  future.sort((a, b) => new Date(a.isoIST) - new Date(b.isoIST));
  return future[0];
}

function findLastResult(team, results) {
  const past = MATCHES.filter(m => {
    if (m.home?.type !== "team" && m.away?.type !== "team") return false;
    if (m.home?.name !== team && m.away?.name !== team) return false;
    return getMatchStatus(m, results) === "finished";
  });
  past.sort((a, b) => new Date(b.isoIST) - new Date(a.isoIST));
  return past[0];
}

export default function MyTeams({ results }) {
  const { favorites } = useFavorites();
  if (!favorites || favorites.length === 0) return null;

  return (
    <motion.section
      className="my-teams"
      data-testid="my-teams"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <div className="sec-head">
        <span className="sec-title" style={{ color: "var(--accent)" }}>
          ★ My Teams
        </span>
        <span className="sec-count">· {favorites.length} followed</span>
        <div className="sec-line" style={{ background: "linear-gradient(90deg, var(--accent-bg-strong), transparent)" }} />
      </div>

      <div className="my-teams-grid">
        {favorites.map(team => {
          const next = findNextMatch(team, results);
          const last = findLastResult(team, results);
          return (
            <motion.div key={team} className="my-team-card" variants={revealUp} data-testid={`my-team-${team}`}>
              <div className="mt-head">
                <TeamFlag team={team} />
                <Link to={`/squads/${encodeURIComponent(team)}`} className="mt-team-name">{team}</Link>
                <FavoriteButton team={team} size={16} />
              </div>

              {next ? (
                <Link to={`/match/${next.id}`} className="mt-next-match">
                  <div className="mt-next-label">
                    {getMatchStatus(next, results) === "live" ? (
                      <><span className="mdt-live-dot" /> LIVE NOW</>
                    ) : "Next Match"}
                  </div>
                  <div className="mt-next-teams">
                    <div className="mt-next-opp">
                      <TeamFlag team={next.home?.type === "team" ? next.home.name : ""} />
                      <span>{next.home?.name || "TBD"}</span>
                    </div>
                    <span className="mt-vs">vs</span>
                    <div className="mt-next-opp away">
                      <span>{next.away?.name || "TBD"}</span>
                      <TeamFlag team={next.away?.type === "team" ? next.away.name : ""} />
                    </div>
                  </div>
                  <div className="mt-next-meta">
                    {next.date} · {next.ist} IST · {next.stage}
                  </div>
                </Link>
              ) : (
                <div className="mt-no-next">
                  {last ? "Group stage complete" : "No more scheduled matches"}
                </div>
              )}

              {last && (
                <div className="mt-last-result">
                  Last:{" "}
                  <strong>{last.home.name}</strong>{" "}
                  {results[last.id]?.homeScore}–{results[last.id]?.awayScore}{" "}
                  <strong>{last.away.name}</strong>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
