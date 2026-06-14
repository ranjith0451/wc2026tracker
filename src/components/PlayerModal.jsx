import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FLAG_URL, FLAGS } from "../data/teams.js";

/* Position meta */
const POS_META = {
  GK: { label: "Goalkeeper",  color: "#f7c948", bg: "rgba(247,201,72,.15)",  chip: "GK", gradient: "linear-gradient(135deg,#f7c948,#f59e0b)" },
  DF: { label: "Defender",    color: "#00b4ff", bg: "rgba(0,180,255,.13)",   chip: "DF", gradient: "linear-gradient(135deg,#00b4ff,#0071e3)" },
  MF: { label: "Midfielder",  color: "#00e5d0", bg: "rgba(0,229,208,.13)",   chip: "MF", gradient: "linear-gradient(135deg,#00e5d0,#059669)" },
  FW: { label: "Forward",     color: "#ff4757", bg: "rgba(255,71,87,.13)",   chip: "FW", gradient: "linear-gradient(135deg,#ff4757,#c0392b)" },
};

/* Derive rough career years from clubs */
function careerYears(clubs) {
  if (!clubs || clubs.length === 0) return "—";
  const years = clubs.map(c => {
    const m = (c.years || "").match(/(\d{4})/g);
    return m ? parseInt(m[0]) : 2020;
  });
  const start = Math.min(...years);
  return `${2026 - start} yrs`;
}

/* Count WC / tournament appearances from achievements */
function wcAppearances(achievements) {
  if (!achievements) return 0;
  return achievements.filter(a =>
    /world cup|wc|tournament|international/i.test(a)
  ).length;
}

/* Avatar gradient by position */
const AVATAR_GRADS = {
  GK: "linear-gradient(135deg,#f7c948 0%,#ef8c1e 100%)",
  DF: "linear-gradient(135deg,#00b4ff 0%,#0047ab 100%)",
  MF: "linear-gradient(135deg,#00e5d0 0%,#059669 100%)",
  FW: "linear-gradient(135deg,#ff4757 0%,#9b1c1c 100%)",
};

function getInitials(name) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

/* Goal halos (animated circles in card bg) */
function HaloBg() {
  return (
    <div className="pm-halos" aria-hidden>
      <div className="pm-halo pm-halo-1" />
      <div className="pm-halo pm-halo-2" />
      <div className="pm-halo pm-halo-3" />
    </div>
  );
}

export default function PlayerModal({ player, teamName, onClose }) {
  const pos  = POS_META[player.position] || POS_META.MF;
  const wc   = wcAppearances(player.achievements);
  const yrs  = careerYears(player.clubs);
  const initials = getInitials(player.name);

  /* Keyboard close */
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div className="pm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pm-card" onClick={e => e.stopPropagation()}>

        {/* ── FIFA-style header ── */}
        <div className="pm-header">
          <HaloBg />

          {/* Close */}
          <button className="pm-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          {/* Position badge TOP-LEFT — FIFA style */}
          <div className="pm-pos-badge" style={{ background: pos.gradient }}>
            {pos.chip}
          </div>

          {/* Avatar + Name row */}
          <div className="pm-hero-row">
            <div className="pm-avatar-wrap">
              <div className="pm-avatar" style={{ background: AVATAR_GRADS[player.position] || AVATAR_GRADS.MF }}>
                <img
                  src={player.image}
                  alt={player.name}
                  className="pm-avatar-img"
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
                <span className="pm-avatar-initials">{initials}</span>
              </div>
              {/* ring */}
              <div className="pm-avatar-ring" style={{ borderColor: pos.color }} />
            </div>

            <div className="pm-hero-info">
              <div className="pm-player-name">{player.name}</div>
              <div className="pm-player-sub">
                <span className="pm-pos-pill" style={{ background: pos.bg, color: pos.color }}>
                  {pos.label}
                </span>
                {FLAGS[teamName] && (
                  <img src={FLAG_URL(teamName)} alt={teamName} className="pm-team-flag" />
                )}
                <span className="pm-team-name">{teamName}</span>
              </div>
            </div>
          </div>

          {/* Quick-stats row */}
          <div className="pm-qs-row">
            <div className="pm-qs-item">
              <div className="pm-qs-val" style={{ color: pos.color }}>{player.clubs?.length ?? "—"}</div>
              <div className="pm-qs-lbl">Clubs</div>
            </div>
            <div className="pm-qs-div" />
            <div className="pm-qs-item">
              <div className="pm-qs-val" style={{ color: pos.color }}>{yrs}</div>
              <div className="pm-qs-lbl">Pro Career</div>
            </div>
            <div className="pm-qs-div" />
            <div className="pm-qs-item">
              <div className="pm-qs-val" style={{ color: pos.color }}>{player.achievements?.length ?? 0}</div>
              <div className="pm-qs-lbl">Achievements</div>
            </div>
            <div className="pm-qs-div" />
            <div className="pm-qs-item">
              <div className="pm-qs-val" style={{ color: "#f7c948" }}>
                {wc > 0 ? wc : "★"}
              </div>
              <div className="pm-qs-lbl">WC Level</div>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="pm-body">

          {/* Tactical profile */}
          {player.tactical && (
            <div className="pm-section">
              <div className="pm-sec-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                Tactical Profile
              </div>
              <div className="pm-tactical">
                <div className="pm-tac-accent" style={{ background: pos.gradient }} />
                <p>{player.tactical}</p>
              </div>
            </div>
          )}

          {/* Achievements */}
          {player.achievements?.length > 0 && (
            <div className="pm-section">
              <div className="pm-sec-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 21V7M16 21V7M5 7h14M12 3v4M9 3l3 4 3-4"/></svg>
                Achievements & Honours
              </div>
              <div className="pm-badges">
                {player.achievements.map((a, i) => (
                  <div key={i} className="pm-badge" style={{ animationDelay: `${i * 0.06}s` }}>
                    <span className="pm-badge-icon">🏆</span>
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Club history */}
          {player.clubs?.length > 0 && (
            <div className="pm-section">
              <div className="pm-sec-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Club Career
              </div>
              <div className="pm-clubs">
                {player.clubs.map((c, i) => (
                  <div key={i} className={`pm-club-row ${i === 0 ? "current" : ""}`}>
                    <div className="pm-club-dot" style={{ background: i === 0 ? pos.color : "rgba(255,255,255,.25)" }} />
                    <div className="pm-club-info">
                      <div className="pm-club-name">{c.name}</div>
                      <div className="pm-club-years">{c.years}</div>
                    </div>
                    {i === 0 && <span className="pm-club-current">Current</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WC Appearances callout */}
          <div className="pm-wc-box">
            <div className="pm-wc-icon">🌍</div>
            <div>
              <div className="pm-wc-title">FIFA World Cup 2026</div>
              <div className="pm-wc-sub">
                {wc > 0
                  ? `${wc} tournament-level achievement${wc > 1 ? "s" : ""} on record`
                  : "First World Cup appearance — making history in 2026"}
              </div>
            </div>
            <div className="pm-wc-star">★</div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
