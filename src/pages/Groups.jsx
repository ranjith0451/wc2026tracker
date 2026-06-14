import { GROUPS } from "../data/teams.js";
import { getGroupStandings } from "../lib/standings.js";
import TeamFlag from "../components/TeamFlag.jsx";

export default function Groups({ results }) {
  return (
    <div>
      <div className="sec-head">
        <span className="sec-title">Group Standings</span>
        <span className="sec-count">· auto-updates from results</span>
        <div className="sec-line" />
      </div>
      <p style={{ fontSize:12, color:"var(--text-dim)", marginBottom:20, lineHeight:1.6 }}>
        Top 2 per group <span style={{ color:"var(--green-bright)", fontWeight:700 }}>■</span> advance to Round of 32.
        Best 8 third-placed teams <span style={{ color:"var(--gold)", fontWeight:700 }}>■</span> also qualify.
        Tiebreakers: pts → GD → GF.
      </p>

      <div className="groups-grid">
        {Object.keys(GROUPS).map(gk => {
          const { rows, complete, played, total } = getGroupStandings(gk, results);
          return (
            <div className="group-card" key={gk}>
              <div className="group-card-head">
                <span className="gname">{gk}</span>
                <span className="gprog">
                  {played}/{total} played{complete ? " · Final" : ""}
                </span>
              </div>
              <table className="standings-tbl">
                <thead>
                  <tr>
                    <th style={{ textAlign:"left", paddingLeft:14 }}>Team</th>
                    <th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th>
                    <th style={{ paddingRight:14 }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.team} className={i < 2 ? "q1" : i === 2 ? "q3" : ""}>
                      <td className="tc-team">
                        <TeamFlag team={r.team} />
                        {r.team}
                      </td>
                      <td>{r.played}</td>
                      <td>{r.won}</td>
                      <td>{r.drawn}</td>
                      <td>{r.lost}</td>
                      <td style={{ color: r.gd > 0 ? "var(--green-bright)" : r.gd < 0 ? "var(--red-bright)" : "var(--text-dim)" }}>
                        {r.gd > 0 ? `+${r.gd}` : r.gd}
                      </td>
                      <td className="tc-pts" style={{ paddingRight:14 }}>{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
