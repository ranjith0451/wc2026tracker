import { Suspense, useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { loadGraph, nodesByType } from "../lib/graph";

// Approximate lat/lng for World Cup host nations.
// Used to place glowing markers on the globe.
const HOST_COORDS = {
  "Uruguay":         [-32.5, -56.0],
  "Italy":           [42.5, 12.5],
  "France":          [46.2, 2.2],
  "Brazil":          [-14.2, -51.9],
  "Switzerland":     [46.8, 8.2],
  "Sweden":          [60.1, 18.6],
  "Chile":           [-35.7, -71.5],
  "England":         [52.3, -1.2],
  "Mexico":          [23.6, -102.5],
  "West Germany":    [51.0, 9.0],
  "Germany":         [51.0, 10.0],
  "Argentina":       [-38.4, -63.6],
  "Spain":           [40.0, -3.7],
  "United States":   [37.0, -95.7],
  "Korea, Japan":    [36.5, 138.0],
  "South Africa":    [-30.5, 22.9],
  "Russia":          [61.5, 105.3],
  "Qatar":           [25.3, 51.2],
  "China":           [35.8, 104.1],
  "Canada":          [56.1, -106.3],
  "Australia, New Zealand": [-35.0, 150.0],
};

function latLngToVec3(lat, lng, radius = 1.02) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function HostMarker({ position, color, year }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const s = 1 + Math.sin(t * 2 + year * 0.1) * 0.18;
    ref.current.scale.setScalar(s);
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.022, 16, 16]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function GlobeMesh({ hosts }) {
  const groupRef = useRef();
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.08;
  });

  return (
    <group ref={groupRef}>
      <Sphere args={[1, 48, 48]}>
        <meshStandardMaterial
          color="#0e1a36"
          emissive="#1a3a7a"
          emissiveIntensity={0.25}
          roughness={0.85}
          metalness={0.1}
        />
      </Sphere>
      <Sphere args={[1.001, 48, 48]}>
        <meshBasicMaterial
          color="#60a5fa"
          wireframe
          transparent
          opacity={0.18}
          toneMapped={false}
        />
      </Sphere>
      {hosts.map((h, i) => (
        <HostMarker
          key={`${h.name}-${h.year}`}
          position={latLngToVec3(h.lat, h.lng)}
          color={h.gender === "women" ? "#f472b6" : "#fbbf24"}
          year={h.year}
        />
      ))}
    </group>
  );
}

export default function HostGlobe({ height = 360 }) {
  const [hosts, setHosts] = useState([]);

  useEffect(() => {
    loadGraph()
      .then(g => {
        const tournaments = nodesByType(g, "Tournament");
        const seen = new Set();
        const list = [];
        for (const t of tournaments) {
          // Pick first host country for multi-host (e.g. "Canada, Mexico, USA")
          const firstHost = (t.host || "").split(/[,/]/)[0].trim();
          const coords = HOST_COORDS[firstHost] || HOST_COORDS[t.host];
          if (!coords) continue;
          const key = `${firstHost}-${t.year}-${t.gender}`;
          if (seen.has(key)) continue;
          seen.add(key);
          list.push({ name: firstHost, year: t.year, gender: t.gender, lat: coords[0], lng: coords[1] });
        }
        setHosts(list);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ width: "100%", height, position: "relative" }}>
      <Canvas
        camera={{ position: [0, 0.4, 2.6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 3, 5]} intensity={0.9} color="#a8c7ff" />
        <directionalLight position={[-3, -2, -4]} intensity={0.3} color="#8b5cf6" />
        <Suspense fallback={null}>
          <GlobeMesh hosts={hosts} />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          rotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
}
