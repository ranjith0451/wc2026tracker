import { Link, useParams, useSearchParams } from "react-router-dom";

export default function PlayerProfileById() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const team = decodeURIComponent(searchParams.get("team") || "");
  const name = decodeURIComponent(searchParams.get("name") || "");

  return (
    <div className="pm-page" data-testid="player-id-profile-page">
      <div className="squad-detail-hero" data-testid="player-id-profile-hero">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 data-testid="player-id-profile-name">{name || "Player"}</h2>
          <div className="mgr" data-testid="player-id-profile-team">{team || "Unknown Team"}</div>
          <div className="mgr" data-testid="player-id-profile-id">Player ID: <strong>{id}</strong></div>
        </div>
      </div>

      <div className="compare-honours" data-testid="player-id-profile-details">
        <h2 className="compare-section-title">Profile Routing</h2>
        <div className="compare-honour-card" style={{ maxWidth: "920px", margin: "0 auto" }}>
          <div className="compare-honour-row">
            <span className="compare-honour-key">Primary Route</span>
            <span className="compare-honour-val">Player ID Route</span>
          </div>
          <div className="compare-honour-row">
            <span className="compare-honour-key">Fallback Route</span>
            <span className="compare-honour-val">
              <Link to={`/player/${encodeURIComponent(team)}/${encodeURIComponent(name)}`}>
                /player/{team || "team"}/{name || "name"}
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
