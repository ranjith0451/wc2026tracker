/**
 * Pack/unpack bracket predictions to/from a compact URL-safe string.
 *
 * Predictor data:
 *   preds:      { matchId: "home" | "away" | "draw" }
 *   groupPicks: { groupKey: [team1, team2, team3, team4] }
 *
 * Format strategy:
 *   - JSON.stringify({preds, groupPicks})
 *   - btoa (base64) → URL-safe transform
 *   - URL hash: #/predictor?bracket=<encoded>
 */

export function encodeBracket(preds, groupPicks) {
  try {
    const payload = { v: 1, p: preds || {}, g: groupPicks || {} };
    const json = JSON.stringify(payload);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    // URL-safe base64
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

export function decodeBracket(str) {
  if (!str) return null;
  try {
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const json = decodeURIComponent(escape(atob(b64)));
    const data = JSON.parse(json);
    if (!data || typeof data !== "object") return null;
    return { preds: data.p || {}, groupPicks: data.g || {} };
  } catch {
    return null;
  }
}

/** Build a complete share URL for the current bracket. */
export function buildShareUrl(preds, groupPicks) {
  const encoded = encodeBracket(preds, groupPicks);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // HashRouter path → /#/predictor?bracket=…
  return `${origin}/#/predictor?bracket=${encoded}`;
}
