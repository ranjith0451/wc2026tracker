import { MATCHES } from "../data/matches.js";
import { resolveMatchTeams, getThirdPlaceAssignments } from "../lib/bracket.js";
import { formatISTFull } from "../lib/time.js";
import TeamFlag from "../components/TeamFlag.jsx";

const KO_STAGES = [
  "Round of 32","Round of 16","Quarterfinal",
  "Semifinal","Third Place","Final",
];

const STAGE_ICONS = {
  "Round of 32": "32",
  "Round of 16": "16",
  "Quarterfinal": "QF",
  "Semifinal":    "SF",
  "Third Place":  "3P",
  "Final":        "F",
};

function BkSide({ side, score, showScore }) {
  if (!side.resolved) {
    return (
      <div className="team-row" style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", fontSize:13, color:"var(--text-faint)", fontStyle:"italic", fontWeight:500 }}>
        {side.name}
        {side.isThird && <span style={{ fontSize:9, color:"var(--gold)", fontWeight:700 }}>*PROV</span>}
      </div>
    );
  }
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0" }}>
      <TeamFlag team={side.name} />
      <span style={{ fontSize:13, fontWeight:700, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {side.name}
      </span>
      {showScore && (
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:16, fontWeight:700, color:"var(--text)", fontVariantNumeric:"tabular-nums" }}>
          {score}
        </span>
      )}
    </div>
  );
}

export default function Bracket({ results }) {
  const thirdAssign = getThirdPlaceAssignments(results);

  return (
    <div>
      <div className="sec-head">
        <span className="sec-title">Knockout Bracket</span>
        <span className="sec-count">· R32 → Final</span>
        <div className="sec-line" />
      </div>
      <p style={{ fontSize:12, color:"var(--text-dim)", marginBottom:24, lineHeight:1.6 }}>
        Slots fill automatically as group standings and knockout results come in.
        {!thirdAssign.ready && " Best 3rd-place matchups (marked PROV) are provisional until all groups finish."}
      </p>

      {KO_STAGES.map(stage => {
        const matches = MATCHES.filter(m => m.stage === stage);
        if (!matches.length) return null;

        const isSpecial = stage === "Final" || stage === "Third Place";

        return (
          <div className="bk-stage" key={stage}>
            <div className="bk-stage-head">
              <span style={{
                background: isSpecial ? "var(--grad-gold)" : "var(--grad-brand)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".18em",
                textTransform: "uppercase",
              }}>
                {STAGE_ICONS[stage]} · {stage}
              </span>
            </div>

            <div className="bk-grid">
              {matches.map(m => {
                const { home, away } = resolveMatchTeams(m, results);
                const result   = results[m.id];
                const showScore = result?.status === "finished" || result?.status === "live";
                const isLive   = result?.status === "live";
                const isFT     = result?.status === "finished";

                return (
                  <div className="bk-card" key={m.id} style={isSpecial ? { border:"1px solid rgba(245,158,11,.25)" } : {}}>
                    <div className="bk-card-head">
                      <span>{formatISTFull(m.isoIST)}</span>
                      {isFT  && <span style={{ color:"var(--green-bright)", fontWeight:700 }}>FT</span>}
                      {isLive && <span style={{ color:"var(--red-bright)", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
                        <span style={{ width:5, height:5, background:"var(--red)", borderRadius:"50%", display:"inline-block" }} />
                        Live
                      </span>}
                    </div>
                    <div className="bk-card-body">
                      <BkSide side={home} score={result?.homeScore} showScore={showScore} />
                      <div style={{ height:1, background:"var(--border-soft)", margin:"4px 0" }} />
                      <BkSide side={away} score={result?.awayScore} showScore={showScore} />
                      {(home.isThird || away.isThird) && (
                        <div className="bk-note">* provisional best-3rd matchup</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
