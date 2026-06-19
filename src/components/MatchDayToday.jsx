import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MATCHES } from "../data/matches.js";
import { getMatchStatus } from "../lib/time.js";
import TeamFlag from "../components/TeamFlag.jsx";
import FavoriteButton from "../components/FavoriteButton.jsx";
import { useFavorites } from "../lib/favorites.js";

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function istDate(date = new Date()) {
  // Returns "YYYY-MM-DD" for the given date in IST timezone
  const istString = date.toLocaleString("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
  return istString; // "2026-06-14"
}

function diffHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { h, m, s, total };
}

function fmtIST(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });
}

/* Resolve display name for any side (handles winner/runnerup placeholders) */
function sideName(side) {
  if (!side) return "TBD";
  if (side.type === "team") return side.name;
  if (side.type === "winner") return `Winner Group ${side.group}`;
  if (side.type === "runnerup") return `Runner-up Group ${side.group}`;
  if (side.type === "third_best") return `Best 3rd`;
  if (side.type === "winner_match") return `Winner M${side.matchId}`;
  if (side.type === "loser_match") return `Loser M${side.matchId}`;
  return "TBD";
}

/* ── Live countdown timer ─────────────────────────────────────────────────── */
function Countdown({ to }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = new Date(to).getTime() - now;
  const { h, m, s, total } = diffHMS(diff);

  if (total <= 0) return <span className="mdt-countdown done">Kicking off…</span>;
  return (
    <span className="mdt-countdown" data-testid="mdt-countdown">
      {h > 0 && <span className="mdt-cd-unit"><b>{String(h).padStart(2,"0")}</b><i>h</i></span>}
      <span className="mdt-cd-unit"><b>{String(m).padStart(2,"0")}</b><i>m</i></span>
      <span className="mdt-cd-unit"><b>{String(s).padStart(2,"0")}</b><i>s</i></span>
    </span>
  );
}

/* ── Single mini match row ─────────────────────────────────────────────────── */
function TodayMatchRow({ match, result, kind }) {
  const home = sideName(match.home);
  const away = sideName(match.away);
  const homeTeam = match.home?.type === "team" ? match.home.name : null;
  const awayTeam = match.away?.type === "team" ? match.away.name : null;
  const { isFav } = useFavorites();
  const fav = (homeTeam && isFav(homeTeam)) || (awayTeam && isFav(awayTeam));
  const isLive = kind === "live";
  const isFinished = kind === "finished";

  return (
    <Link
      to={`/match/${match.id}`}
      className={`mdt-row ${kind} ${fav ? "is-fav" : ""}`}
      data-testid={`mdt-row-${match.id}`}
    >
      <div className="mdt-stage">
        {isLive && <span className="mdt-live-dot" />}
        {isLive ? "LIVE" : isFinished ? "FT" : fmtIST(match.isoIST)}
      </div>
      <div className="mdt-teams">
        <div className="mdt-team">
          <TeamFlag team={homeTeam || ""} />
          <span className="mdt-team-name">{home}</span>
          {homeTeam && <FavoriteButton team={homeTeam} size={14} />}
        </div>
        <div className="mdt-score">
          {isLive || isFinished
            ? <span className="mdt-score-num">{result?.homeScore ?? 0} – {result?.awayScore ?? 0}</span>
            : <span className="mdt-vs">vs</span>}
        </div>
        <div className="mdt-team away">
          {awayTeam && <FavoriteButton team={awayTeam} size={14} />}
          <span className="mdt-team-name">{away}</span>
          <TeamFlag team={awayTeam || ""} />
        </div>
      </div>
      <div className="mdt-meta">
        {isLive && result?.elapsed != null && <span className="mdt-elapsed">{result.elapsed}&apos;</span>}
        {!isLive && !isFinished && <Countdown to={match.isoIST} />}
        {match.stage !== "Group Stage" && (
          <span className="mdt-stage-tag">{match.stage}</span>
        )}
      </div>
    </Link>
  );
}

/* ── Main widget ──────────────────────────────────────────────────────────── */
export default function MatchDayToday({ results }) {
  const [today, setToday] = useState(() => istDate());

  // Re-evaluate today's date every minute (handles midnight rollover)
  useEffect(() => {
    const id = setInterval(() => setToday(istDate()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Filter today's matches in IST
  const todayMatches = MATCHES.filter(m => (m.isoIST || "").startsWith(today));

  if (todayMatches.length === 0) {
    // Find next upcoming match (across all days)
    const nextUpcoming = MATCHES
      .filter(m => new Date(m.isoIST).getTime() > Date.now() && getMatchStatus(m, results) === "scheduled")
      .sort((a, b) => new Date(a.isoIST) - new Date(b.isoIST))[0];

    if (!nextUpcoming) return null;

    return (
      <div className="match-day-today empty" data-testid="match-day-today-empty">
        <div className="mdt-head">
          <span className="mdt-head-title">No matches today · Next kickoff in</span>
          <Countdown to={nextUpcoming.isoIST} />
        </div>
        <TodayMatchRow match={nextUpcoming} result={results[nextUpcoming.id]} kind="upcoming" />
      </div>
    );
  }

  const enriched = todayMatches.map(m => ({ m, status: getMatchStatus(m, results), result: results[m.id] }));
  const live = enriched.filter(x => x.status === "live");
  const upcoming = enriched.filter(x => x.status === "scheduled");
  const finished = enriched.filter(x => x.status === "finished");

  // Friendly date label
  const todayLabel = new Date(today + "T12:00:00+05:30").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata",
  });

  return (
    <div className="match-day-today" data-testid="match-day-today">
      <div className="mdt-head">
        <div className="mdt-head-left">
          <div className="mdt-head-eyebrow">
            {live.length > 0 ? <><span className="mdt-live-dot" /> Live matchday</> : "Today\u2019s Schedule"}
          </div>
          <div className="mdt-head-date">{todayLabel}</div>
        </div>
        <div className="mdt-head-stats">
          {live.length > 0 && <span className="mdt-pill live">{live.length} LIVE</span>}
          {upcoming.length > 0 && <span className="mdt-pill upcoming">{upcoming.length} upcoming</span>}
          {finished.length > 0 && <span className="mdt-pill finished">{finished.length} done</span>}
        </div>
      </div>

      <div className="mdt-list" data-testid="mdt-list">
        {/* Order: live → upcoming → finished */}
        {live.map(x => <TodayMatchRow key={x.m.id} match={x.m} result={x.result} kind="live" />)}
        {upcoming
          .sort((a, b) => new Date(a.m.isoIST) - new Date(b.m.isoIST))
          .map(x => <TodayMatchRow key={x.m.id} match={x.m} result={x.result} kind="upcoming" />)}
        {finished.map(x => <TodayMatchRow key={x.m.id} match={x.m} result={x.result} kind="finished" />)}
      </div>
    </div>
  );
}
