/**
 * Color-coded rating chip.
 * Green ≥7.5 | Yellow 6.0–7.4 | Red <6.0
 */
export default function PlayerRatingChip({ rating, size = 'md', showLabel = false }) {
  if (rating == null) return null;

  const color = rating >= 7.5 ? 'green' : rating >= 6.0 ? 'yellow' : 'red';
  const label = color === 'green' ? 'Excellent' : color === 'yellow' ? 'Average' : 'Poor';

  return (
    <span className={`rating-chip rating-chip--${color} rating-chip--${size}`} title={label}>
      {rating.toFixed(1)}
      {showLabel && <span className="rating-chip__label">{label}</span>}
    </span>
  );
}

/**
 * Full player row with rating for match summary view.
 */
export function PlayerRatingRow({ player, showHeatmapBtn, onHeatmap }) {
  if (!player) return null;
  return (
    <div className="pr-row">
      <div className="pr-row__left">
        <PlayerRatingChip rating={player.rating} size="sm" />
        <div className="pr-row__info">
          <span className="pr-row__name">{player.name}</span>
          <span className="pr-row__meta">{player.position} · {player.minutesPlayed ?? 90}'</span>
        </div>
      </div>
      <div className="pr-row__right">
        {player.yellowCards > 0 && (
          <span className="pr-card yellow" title="Yellow card">{player.yellowCards}</span>
        )}
        {player.redCard && (
          <span className="pr-card red" title="Red card" />
        )}
        {player.ownGoals > 0 && (
          <span className="pr-event og" title="Own goal">OG</span>
        )}
        {showHeatmapBtn && onHeatmap && (
          <button className="pr-heatmap-btn" onClick={() => onHeatmap(player)} title="View heatmap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
