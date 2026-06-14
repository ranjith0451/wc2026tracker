// All match times in MATCHES are already IST (Asia/Kolkata, UTC+5:30) ISO strings.

export function formatISTTime(isoIST) {
  const d = new Date(isoIST);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export function formatISTDate(isoIST) {
  const d = new Date(isoIST);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

export function formatISTFull(isoIST) {
  return `${formatISTDate(isoIST)}, ${formatISTTime(isoIST)} IST`;
}

// Returns "scheduled" | "live" | "finished"
// A match is considered "live" for MATCH_DURATION_MS after kickoff if no result recorded yet.
const MATCH_DURATION_MS = 2.25 * 60 * 60 * 1000; // ~2h15m incl. stoppage

export function getMatchStatus(match, results) {
  const result = results[match.id];
  if (result && result.status === "finished") return "finished";
  const kickoff = new Date(match.isoIST).getTime();
  const now = Date.now();
  if (result && result.status === "live") return "live";
  if (now < kickoff) return "scheduled";
  if (now >= kickoff && now < kickoff + MATCH_DURATION_MS) return "live";
  return "finished"; // kickoff + duration has passed, so the match is over even if no result was entered yet
}

export function timeUntil(isoIST) {
  const diff = new Date(isoIST).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}
