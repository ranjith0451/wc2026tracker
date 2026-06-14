// Manual result entries are stored in localStorage as "overrides" and merged
// on top of whatever public/data/results.json provides. This lets you enter
// a result the moment a match finishes and see the whole app (standings,
// bracket, top scorers) update immediately in your browser — then download
// the merged JSON and drop it into public/data/results.json to make it live
// for everyone else.

const KEY = "wc26_result_overrides";

export function loadOverrides() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveOverrides(overrides) {
  try {
    localStorage.setItem(KEY, JSON.stringify(overrides));
  } catch {
    // ignore (e.g. storage disabled)
  }
}

// fetched: results loaded from results.json
// overrides: { [matchId]: resultObject | null }  (null = explicitly cleared)
export function mergeResults(fetched, overrides) {
  const merged = { ...fetched };
  Object.entries(overrides || {}).forEach(([id, val]) => {
    if (val === null || val === undefined) {
      delete merged[id];
    } else {
      merged[id] = val;
    }
  });
  return merged;
}
