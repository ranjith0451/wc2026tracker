import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";

// Layout: tournaments on a circular ring sorted by year; players orbit
// their primary (earliest) tournament; teams sit in an outer ring.
function layoutGraph(graph) {
  const tournaments = graph.nodes.filter(n => n.type === "Tournament");
  const players = graph.nodes.filter(n => n.type === "Player");
  tournaments.sort((a, b) => a.year - b.year || (a.gender === "men" ? -1 : 1));

  const positions = new Map();
  const ringR = 7;
  tournaments.forEach((t, i) => {
    const angle = (i / tournaments.length) * Math.PI * 2;
    const y = t.gender === "women" ? 1.2 : -1.2;
    positions.set(t.id, [Math.cos(angle) * ringR, y, Math.sin(angle) * ringR]);
  });

  // Players orbit the centroid of their tournaments
  players.forEach((p, i) => {
    const years = p.tournaments || [];
    const matched = tournaments.filter(t => t.gender === p.gender && years.includes(t.year));
    let cx = 0, cz = 0;
    if (matched.length) {
      for (const t of matched) {
        const [x, , z] = positions.get(t.id);
        cx += x; cz += z;
      }
      cx /= matched.length;
      cz /= matched.length;
    }
    const orbit = 1.2 + (i % 5) * 0.25;
    const a = (i * 2.4) % (Math.PI * 2);
    const px = cx + Math.cos(a) * orbit;
    const pz = cz + Math.sin(a) * orbit;
    const py = (p.gender === "women" ? 1.2 : -1.2) + (i % 3 - 1) * 0.3;
    positions.set(p.id, [px, py, pz]);
  });

  return positions;
}

function NodeMesh({ node, position, selected, onClick }) {
  const ref = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const base = selected ? 1.6 : hovered ? 1.3 : 1;
    const pulse = selected ? 1 + Math.sin(clock.getElapsedTime() * 3) * 0.08 : 1;
    ref.current.scale.setScalar(base * pulse);
  });

  let color = "#60a5fa";
  let radius = 0.08;
  if (node.type === "Tournament") {
    color = node.gender === "women" ? "#f472b6" : "#fbbf24";
    radius = 0.16;
  } else if (node.type === "Player") {
    color = node.gender === "women" ? "#ec4899" : "#a8c7ff";
    radius = 0.06 + Math.min(0.12, (node.goals || 0) * 0.006);
  }

  return (
    <mesh
      ref={ref}
      position={position}
      onClick={e => { e.stopPropagation(); onClick(node); }}
      onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
    >
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={selected ? 1.4 : hovered ? 0.9 : 0.45}
        roughness={0.3}
      />
    </mesh>
  );
}

function EdgeLine({ from, to, highlight }) {
  return (
    <Line
      points={[from, to]}
      color={highlight ? "#fbbf24" : "#3b82f6"}
      lineWidth={highlight ? 1.5 : 0.5}
      transparent
      opacity={highlight ? 0.8 : 0.12}
    />
  );
}

function Scene({ graph, onSelect, selectedId }) {
  const positions = useMemo(() => layoutGraph(graph), [graph]);
  const renderableNodes = useMemo(
    () => graph.nodes.filter(n => n.type === "Tournament" || n.type === "Player"),
    [graph]
  );

  // Only render edges connected to selected node (perf + clarity)
  const edges = useMemo(() => {
    if (!selectedId) return [];
    return graph.edges
      .filter(e => e.source === selectedId || e.target === selectedId)
      .map((e, i) => {
        const a = positions.get(e.source);
        const b = positions.get(e.target);
        if (!a || !b) return null;
        return { key: `${e.source}-${e.target}-${i}`, from: a, to: b };
      })
      .filter(Boolean);
  }, [graph, positions, selectedId]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#a8c7ff" />
      <directionalLight position={[-5, -3, -2]} intensity={0.4} color="#8b5cf6" />

      {edges.map(e => <EdgeLine key={e.key} from={e.from} to={e.to} highlight />)}

      {renderableNodes.map(n => {
        const pos = positions.get(n.id);
        if (!pos) return null;
        return (
          <NodeMesh
            key={n.id}
            node={n}
            position={pos}
            selected={selectedId === n.id}
            onClick={onSelect}
          />
        );
      })}

      {/* Tournament year labels */}
      {graph.nodes
        .filter(n => n.type === "Tournament" && n.gender === "men")
        .map(t => {
          const pos = positions.get(t.id);
          if (!pos) return null;
          return (
            <Text
              key={`lbl-${t.id}`}
              position={[pos[0] * 1.18, pos[1] - 0.4, pos[2] * 1.18]}
              fontSize={0.28}
              color="#9ca3af"
              anchorX="center"
              anchorY="middle"
            >
              {t.year}
            </Text>
          );
        })}
    </>
  );
}

export default function GraphCanvas({ graph, onSelect, selectedId }) {
  return (
    <Canvas
      camera={{ position: [0, 6, 14], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#020817"]} />
      <fog attach="fog" args={["#020817", 14, 28]} />
      <Scene graph={graph} onSelect={onSelect} selectedId={selectedId} />
      <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.4} />
    </Canvas>
  );
}
