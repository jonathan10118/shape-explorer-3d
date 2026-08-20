import { useMemo } from "react";

import type { NetShape } from "@/data/solids";

const d2r = (d: number) => (d * Math.PI) / 180;

function sectorPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = [cx + r * Math.cos(d2r(a0)), cy + r * Math.sin(d2r(a0))];
  const p1 = [cx + r * Math.cos(d2r(a1)), cy + r * Math.sin(d2r(a1))];
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p0[0]} ${p0[1]} A ${r} ${r} 0 ${large} 1 ${p1[0]} ${p1[1]} Z`;
}

function bounds(shapes: NetShape[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const acc = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const s of shapes) {
    if (s.kind === "poly") s.points.forEach(([x, y]) => acc(x, y));
    else if (s.kind === "circle") {
      acc(s.cx - s.r, s.cy - s.r);
      acc(s.cx + s.r, s.cy + s.r);
    } else {
      acc(s.cx, s.cy);
      const step = 2;
      for (let a = s.a0; a <= s.a1 + 0.001; a += step) {
        acc(s.cx + s.r * Math.cos(d2r(a)), s.cy + s.r * Math.sin(d2r(a)));
      }
      acc(s.cx + s.r * Math.cos(d2r(s.a1)), s.cy + s.r * Math.sin(d2r(s.a1)));
    }
  }
  return { minX, minY, maxX, maxY };
}

export function SolidNet({ shapes }: { shapes: NetShape[] }) {
  const { viewBox, stroke } = useMemo(() => {
    const b = bounds(shapes);
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    const pad = Math.max(w, h) * 0.06 + 0.4;
    return {
      viewBox: `${b.minX - pad} ${b.minY - pad} ${w + pad * 2} ${h + pad * 2}`,
      stroke: Math.max(w, h) / 220,
    };
  }, [shapes]);

  return (
    <svg viewBox={viewBox} className="h-full w-full" role="img" aria-label="Planificação do sólido">
      <g
        fill="var(--net-fill)"
        stroke="var(--net-stroke)"
        strokeWidth={stroke}
        strokeLinejoin="round"
      >
        {shapes.map((s, i) =>
          s.kind === "poly" ? (
            <polygon key={i} points={s.points.map(([x, y]) => `${x},${y}`).join(" ")} />
          ) : s.kind === "circle" ? (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r} />
          ) : (
            <path key={i} d={sectorPath(s.cx, s.cy, s.r, s.a0, s.a1)} />
          ),
        )}
      </g>
    </svg>
  );
}
