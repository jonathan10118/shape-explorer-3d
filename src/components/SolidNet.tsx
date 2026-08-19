import { useMemo } from "react";
import type { Params, SolidDef } from "@/data/solids";

const TAU = Math.PI * 2;

function sectorPath(cx: number, cy: number, r: number, start: number, sweep: number) {
  if (sweep >= TAU - 1e-6) {
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
  }
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(start + sweep);
  const y2 = cy + r * Math.sin(start + sweep);
  const large = sweep > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

export default function SolidNet({ solid, params }: { solid: SolidDef; params: Params }) {
  const { shapes, viewBox } = useMemo(() => {
    const list = solid.net(params);
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const bump = (x: number, y: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };
    for (const s of list) {
      if (s.type === "poly") s.points.forEach(([x, y]) => bump(x, y));
      else if (s.type === "circle") {
        bump(s.cx - s.r, s.cy - s.r);
        bump(s.cx + s.r, s.cy + s.r);
      } else {
        bump(s.cx - s.r, s.cy - s.r);
        bump(s.cx + s.r, s.cy + s.r);
      }
    }
    const pad = 0.6;
    return {
      shapes: list,
      viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`,
    };
  }, [solid, params]);

  return (
    <svg viewBox={viewBox} className="h-full w-full" role="img" aria-label={`Planificação do ${solid.name}`}>
      <g
        fill="var(--net-fill)"
        stroke="var(--net-stroke)"
        strokeWidth={0.045}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        {shapes.map((s, i) =>
          s.type === "poly" ? (
            <polygon key={i} points={s.points.map(([x, y]) => `${x},${y}`).join(" ")} />
          ) : s.type === "circle" ? (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r} />
          ) : (
            <path key={i} d={sectorPath(s.cx, s.cy, s.r, s.start, s.sweep)} />
          ),
        )}
      </g>
    </svg>
  );
}
