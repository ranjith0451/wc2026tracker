import { useEffect, useState } from "react";
import { loadGraph } from "./graph";

export function useGraph() {
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadGraph()
      .then(g => { if (!cancelled) setGraph(g); })
      .catch(e => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, []);
  return { graph, error };
}
