import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Stage } from "@react-three/drei";
import { Suspense } from "react";

import type { Geometry3D } from "@/data/solids";

function Mesh({ g, wire }: { g: Geometry3D; wire: boolean }) {
  const geo =
    g.type === "cone" ? (
      <coneGeometry args={[g.r, g.h, g.seg]} />
    ) : g.type === "cylinder" || g.type === "prism" ? (
      <cylinderGeometry args={[g.r, g.r, g.h, g.seg]} />
    ) : g.type === "box" ? (
      <boxGeometry args={[g.a, g.b, g.c]} />
    ) : g.solid === "tetra" ? (
      <tetrahedronGeometry args={[g.r]} />
    ) : g.solid === "dodeca" ? (
      <dodecahedronGeometry args={[g.r]} />
    ) : (
      <icosahedronGeometry args={[g.r]} />
    );

  return (
    <mesh castShadow receiveShadow>
      {geo}
      <meshStandardMaterial
        color="#3fd0e0"
        roughness={0.35}
        metalness={0.1}
        transparent
        opacity={wire ? 0.12 : 0.85}
        flatShading
      />
      <Edges threshold={15} color="#ffc65c" scale={1.001} />
    </mesh>
  );
}

export function SolidScene({ geometry, wire }: { geometry: Geometry3D; wire: boolean }) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [8, 6, 10], fov: 40 }}>
      <color attach="background" args={["#070d1b"]} />
      <Suspense fallback={null}>
        <Stage intensity={0.5} environment="city" adjustCamera={1.4} shadows="contact">
          <Mesh g={geometry} wire={wire} />
        </Stage>
      </Suspense>
      <OrbitControls makeDefault autoRotate autoRotateSpeed={0.8} enablePan={false} />
    </Canvas>
  );
}
