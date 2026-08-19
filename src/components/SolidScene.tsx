import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges, Grid, ContactShadows } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { Params, SolidDef } from "@/data/solids";

function SolidMesh({ solid, params, wireframe }: { solid: SolidDef; params: Params; wireframe: boolean }) {
  const geometry = useMemo(() => {
    const spec = solid.geometry(params);
    switch (spec.kind) {
      case "box":
        return new THREE.BoxGeometry(...spec.args);
      case "cylinder":
        return new THREE.CylinderGeometry(...spec.args);
      case "cone":
        return new THREE.ConeGeometry(...spec.args);
      case "platonic":
        if (spec.solid === "tetra") return new THREE.TetrahedronGeometry(spec.radius);
        if (spec.solid === "dodeca") return new THREE.DodecahedronGeometry(spec.radius);
        return new THREE.IcosahedronGeometry(spec.radius);
    }
  }, [solid, params]);

  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          color="#7fd4e8"
          roughness={0.28}
          metalness={0.15}
          transparent
          opacity={wireframe ? 0.12 : 0.92}
          flatShading
        />
        <Edges threshold={12} color="#ffd27d" scale={1.001} />
      </mesh>
    </group>
  );
}

export default function SolidScene({
  solid,
  params,
  wireframe,
  spin,
}: {
  solid: SolidDef;
  params: Params;
  wireframe: boolean;
  spin: boolean;
}) {
  return (
    <Canvas shadows camera={{ position: [6, 4.5, 7], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={["#0b1220"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
      <directionalLight position={[-6, 3, -4]} intensity={0.5} color="#7fd4e8" />
      <group position={[0, 0.4, 0]}>
        <SolidMesh solid={solid} params={params} wireframe={wireframe} />
      </group>
      <ContactShadows position={[0, -2.6, 0]} opacity={0.45} scale={18} blur={2.6} far={8} />
      <Grid
        position={[0, -2.6, 0]}
        args={[24, 24]}
        cellSize={0.6}
        cellColor="#1e3350"
        sectionSize={3}
        sectionColor="#2b4c73"
        fadeDistance={26}
        infiniteGrid
      />
      <OrbitControls
        enablePan={false}
        autoRotate={spin}
        autoRotateSpeed={1.1}
        minDistance={3}
        maxDistance={20}
      />
    </Canvas>
  );
}
