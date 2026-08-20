export type Pt = [number, number];

export type NetShape =
  | { kind: "poly"; points: Pt[] }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "sector"; cx: number; cy: number; r: number; a0: number; a1: number };

export type ParamDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
};

export type Geometry3D =
  | { type: "cone"; r: number; h: number; seg: number }
  | { type: "cylinder"; r: number; h: number; seg: number }
  | { type: "box"; a: number; b: number; c: number }
  | { type: "prism"; r: number; h: number; seg: number }
  | { type: "poly"; solid: "tetra" | "dodeca" | "icosa"; r: number };

export type Measure = { label: string; formula: string; value: number; unit: string };

export type Solid = {
  id: string;
  name: string;
  family: "Corpos redondos" | "Prismas" | "Pirâmides" | "Poliedros de Platão";
  desc: string;
  params: ParamDef[];
  counts: (p: Rec) => { F: number; E: number; V: number };
  measures: (p: Rec) => Measure[];
  net: (p: Rec) => NetShape[];
  geometry: (p: Rec) => Geometry3D;
  facts: string[];
};

export type Rec = { r: number; h: number; a: number; b: number; c: number };

const TAU = Math.PI * 2;
const d2r = (d: number) => (d * Math.PI) / 180;

/** Regular polygon with n sides of length `a`, centered at (cx,cy), first vertex at angle `rot`. */
function regular(n: number, a: number, cx = 0, cy = 0, rot = -90): Pt[] {
  const R = a / (2 * Math.sin(Math.PI / n));
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const ang = d2r(rot) + (i * TAU) / n;
    pts.push([cx + R * Math.cos(ang), cy + R * Math.sin(ang)]);
  }
  return pts;
}

function rotate180About(pts: Pt[], m: Pt): Pt[] {
  return pts.map(([x, y]) => [2 * m[0] - x, 2 * m[1] - y] as Pt);
}

function translate(pts: Pt[], dx: number, dy: number): Pt[] {
  return pts.map(([x, y]) => [x + dx, y + dy] as Pt);
}

/** Pentagon "flower": one central pentagon + 5 pentagons folded out on each edge. */
function pentagonFlower(a: number, cx: number, cy: number, rot: number): NetShape[] {
  const center = regular(5, a, cx, cy, rot);
  const shapes: NetShape[] = [{ kind: "poly", points: center }];
  for (let i = 0; i < 5; i++) {
    const p = center[i]!;
    const q = center[(i + 1) % 5]!;
    const m: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    shapes.push({ kind: "poly", points: rotate180About(center, m) });
  }
  return shapes;
}

/** Prism net: lateral rectangles in a row + two regular n-gon bases. */
function prismNet(n: number, a: number, h: number): NetShape[] {
  const shapes: NetShape[] = [];
  for (let i = 0; i < n; i++) {
    shapes.push({
      kind: "poly",
      points: [
        [i * a, 0],
        [(i + 1) * a, 0],
        [(i + 1) * a, h],
        [i * a, h],
      ],
    });
  }
  const apo = a / (2 * Math.tan(Math.PI / n));
  const R = a / (2 * Math.sin(Math.PI / n));
  // base attached to the top edge of the first rectangle
  const topBase = regular(n, a, a / 2, -apo, n % 2 === 0 ? -90 + 180 / n : -90);
  const botBase = regular(n, a, a / 2, h + apo, n % 2 === 0 ? 90 + 180 / n : 90);
  shapes.push({ kind: "poly", points: alignBase(topBase, a, 0, true) });
  shapes.push({ kind: "poly", points: alignBase(botBase, a, h, false) });
  void R;
  return shapes;
}

/** Snap a regular polygon so that one of its edges coincides with [0,y]-[a,y]. */
function alignBase(pts: Pt[], a: number, y: number, above: boolean): Pt[] {
  // find the edge closest to horizontal at the correct side, then translate
  let best = 0;
  let bestVal = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    const horiz = Math.abs(p[1] - q[1]);
    const my = (p[1] + q[1]) / 2;
    const score = horiz * 1000 + (above ? -my : my);
    if (score < bestVal) {
      bestVal = score;
      best = i;
    }
  }
  const p = pts[best]!;
  const q = pts[(best + 1) % pts.length]!;
  const mx = (p[0] + q[0]) / 2;
  const my = (p[1] + q[1]) / 2;
  return translate(pts, a / 2 - mx, y - my);
}

/** Pyramid net: regular n-gon base + n isosceles triangles folded out. */
function pyramidNet(n: number, a: number, h: number): NetShape[] {
  const base = regular(n, a, 0, 0, -90);
  const apo = a / (2 * Math.tan(Math.PI / n));
  const slant = Math.sqrt(h * h + apo * apo);
  const shapes: NetShape[] = [{ kind: "poly", points: base }];
  for (let i = 0; i < n; i++) {
    const p = base[i]!;
    const q = base[(i + 1) % n]!;
    const m: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const len = Math.hypot(m[0], m[1]) || 1;
    const nx = m[0] / len;
    const ny = m[1] / len;
    shapes.push({
      kind: "poly",
      points: [p, q, [m[0] + nx * slant, m[1] + ny * slant]],
    });
  }
  return shapes;
}

const round = (v: number) => Math.round(v * 100) / 100;

export const SOLIDS: Solid[] = [
  {
    id: "cone",
    name: "Cone",
    family: "Corpos redondos",
    desc: "Sólido de revolução gerado por um triângulo retângulo girando em torno de um cateto.",
    params: [
      { key: "r", label: "Raio da base (r)", min: 1, max: 6, step: 0.1, def: 3 },
      { key: "h", label: "Altura (h)", min: 1, max: 10, step: 0.1, def: 5 },
    ],
    counts: () => ({ F: 2, E: 1, V: 1 }),
    measures: ({ r, h }) => {
      const g = Math.hypot(r, h);
      return [
        { label: "Geratriz", formula: "g = √(r² + h²)", value: round(g), unit: "cm" },
        {
          label: "Área da base",
          formula: "A_b = π·r²",
          value: round(Math.PI * r * r),
          unit: "cm²",
        },
        {
          label: "Área lateral",
          formula: "A_l = π·r·g",
          value: round(Math.PI * r * g),
          unit: "cm²",
        },
        {
          label: "Área total",
          formula: "A_t = π·r·(r + g)",
          value: round(Math.PI * r * (r + g)),
          unit: "cm²",
        },
        {
          label: "Volume",
          formula: "V = (π·r²·h)/3",
          value: round((Math.PI * r * r * h) / 3),
          unit: "cm³",
        },
      ];
    },
    net: ({ r, h }) => {
      const g = Math.hypot(r, h);
      const theta = (TAU * r) / g; // ângulo do setor circular
      // apex na origem, setor abrindo para baixo, círculo tangente ao meio do arco
      const a0 = 90 - (theta * 180) / Math.PI / 2;
      const a1 = 90 + (theta * 180) / Math.PI / 2;
      return [
        { kind: "sector", cx: 0, cy: 0, r: g, a0, a1 },
        { kind: "circle", cx: 0, cy: g + r, r },
      ];
    },
    geometry: ({ r, h }) => ({ type: "cone", r, h, seg: 64 }),
    facts: [
      "A planificação é um círculo (base) mais um setor circular de raio igual à geratriz g.",
      "O ângulo do setor vale θ = 2π·r/g radianos — nunca uma volta completa.",
      "O volume é exatamente 1/3 do cilindro de mesma base e mesma altura.",
    ],
  },
  {
    id: "cilindro",
    name: "Cilindro",
    family: "Corpos redondos",
    desc: "Sólido de revolução gerado por um retângulo girando em torno de um de seus lados.",
    params: [
      { key: "r", label: "Raio da base (r)", min: 1, max: 6, step: 0.1, def: 2.5 },
      { key: "h", label: "Altura (h)", min: 1, max: 10, step: 0.1, def: 6 },
    ],
    counts: () => ({ F: 3, E: 2, V: 0 }),
    measures: ({ r, h }) => [
      {
        label: "Perímetro da base",
        formula: "P = 2·π·r",
        value: round(TAU * r),
        unit: "cm",
      },
      { label: "Área da base", formula: "A_b = π·r²", value: round(Math.PI * r * r), unit: "cm²" },
      {
        label: "Área lateral",
        formula: "A_l = 2·π·r·h",
        value: round(TAU * r * h),
        unit: "cm²",
      },
      {
        label: "Área total",
        formula: "A_t = 2·π·r·(r + h)",
        value: round(TAU * r * (r + h)),
        unit: "cm²",
      },
      { label: "Volume", formula: "V = π·r²·h", value: round(Math.PI * r * r * h), unit: "cm³" },
    ],
    net: ({ r, h }) => {
      const w = TAU * r; // a largura do retângulo é o comprimento da circunferência
      return [
        {
          kind: "poly",
          points: [
            [0, 0],
            [w, 0],
            [w, h],
            [0, h],
          ],
        },
        { kind: "circle", cx: w / 2, cy: -r, r },
        { kind: "circle", cx: w / 2, cy: h + r, r },
      ];
    },
    geometry: ({ r, h }) => ({ type: "cylinder", r, h, seg: 64 }),
    facts: [
      "O retângulo lateral tem largura exatamente igual a 2π·r (o contorno da base).",
      "Os dois círculos ficam tangentes ao retângulo, um em cima e outro embaixo.",
      "Se h = 2r, o cilindro é dito equilátero.",
    ],
  },
  {
    id: "paralelepipedo",
    name: "Paralelepípedo",
    family: "Prismas",
    desc: "Prisma reto de base retangular: todas as seis faces são retângulos.",
    params: [
      { key: "a", label: "Comprimento (a)", min: 1, max: 8, step: 0.1, def: 5 },
      { key: "b", label: "Largura (b)", min: 1, max: 8, step: 0.1, def: 3 },
      { key: "c", label: "Altura (c)", min: 1, max: 8, step: 0.1, def: 2 },
    ],
    counts: () => ({ F: 6, E: 12, V: 8 }),
    measures: ({ a, b, c }) => [
      {
        label: "Área total",
        formula: "A = 2(ab + ac + bc)",
        value: round(2 * (a * b + a * c + b * c)),
        unit: "cm²",
      },
      { label: "Volume", formula: "V = a·b·c", value: round(a * b * c), unit: "cm³" },
      {
        label: "Diagonal",
        formula: "D = √(a² + b² + c²)",
        value: round(Math.sqrt(a * a + b * b + c * c)),
        unit: "cm",
      },
      {
        label: "Soma das arestas",
        formula: "S = 4(a + b + c)",
        value: round(4 * (a + b + c)),
        unit: "cm",
      },
    ],
    net: ({ a, b, c }) => {
      const rect = (x: number, y: number, w: number, hh: number): NetShape => ({
        kind: "poly",
        points: [
          [x, y],
          [x + w, y],
          [x + w, y + hh],
          [x, y + hh],
        ],
      });
      return [
        rect(c, 0, a, b),
        rect(0, b, c, c),
        rect(c, b, a, c),
        rect(c + a, b, c, c),
        rect(c, b + c, a, b),
        rect(c, b + c + b, a, c),
      ];
    },
    geometry: ({ a, b, c }) => ({ type: "box", a, b: c, c: b }),
    facts: [
      "É o sólido das caixas: a planificação em cruz tem 3 pares de faces iguais.",
      "Todas as faces opostas são congruentes e paralelas.",
      "Quando a = b = c, o paralelepípedo vira um cubo.",
    ],
  },
  {
    id: "cubo",
    name: "Cubo",
    family: "Poliedros de Platão",
    desc: "Hexaedro regular: seis faces quadradas idênticas.",
    params: [{ key: "a", label: "Aresta (a)", min: 1, max: 8, step: 0.1, def: 4 }],
    counts: () => ({ F: 6, E: 12, V: 8 }),
    measures: ({ a }) => [
      { label: "Área da face", formula: "A_f = a²", value: round(a * a), unit: "cm²" },
      { label: "Área total", formula: "A = 6a²", value: round(6 * a * a), unit: "cm²" },
      { label: "Volume", formula: "V = a³", value: round(a ** 3), unit: "cm³" },
      { label: "Diagonal", formula: "D = a√3", value: round(a * Math.sqrt(3)), unit: "cm" },
    ],
    net: ({ a }) => {
      const rect = (x: number, y: number): NetShape => ({
        kind: "poly",
        points: [
          [x, y],
          [x + a, y],
          [x + a, y + a],
          [x, y + a],
        ],
      });
      return [rect(a, 0), rect(0, a), rect(a, a), rect(2 * a, a), rect(a, 2 * a), rect(a, 3 * a)];
    },
    geometry: ({ a }) => ({ type: "box", a, b: a, c: a }),
    facts: [
      "Existem 11 planificações diferentes possíveis para o cubo.",
      "É o único poliedro de Platão que preenche o espaço sozinho.",
      "Euler: 6 + 8 − 12 = 2.",
    ],
  },
  {
    id: "prisma-triangular",
    name: "Prisma triangular",
    family: "Prismas",
    desc: "Duas bases triangulares equiláteras ligadas por três retângulos.",
    params: [
      { key: "a", label: "Aresta da base (a)", min: 1, max: 8, step: 0.1, def: 4 },
      { key: "h", label: "Altura (h)", min: 1, max: 10, step: 0.1, def: 6 },
    ],
    counts: () => ({ F: 5, E: 9, V: 6 }),
    measures: ({ a, h }) => {
      const ab = (Math.sqrt(3) / 4) * a * a;
      return [
        { label: "Área da base", formula: "A_b = (a²√3)/4", value: round(ab), unit: "cm²" },
        { label: "Área lateral", formula: "A_l = 3·a·h", value: round(3 * a * h), unit: "cm²" },
        {
          label: "Área total",
          formula: "A_t = 2·A_b + A_l",
          value: round(2 * ab + 3 * a * h),
          unit: "cm²",
        },
        { label: "Volume", formula: "V = A_b·h", value: round(ab * h), unit: "cm³" },
      ];
    },
    net: ({ a, h }) => prismNet(3, a, h),
    geometry: ({ a, h }) => ({ type: "prism", r: a / Math.sqrt(3), h, seg: 3 }),
    facts: [
      "A planificação é uma faixa de 3 retângulos com um triângulo em cada extremidade.",
      "É o formato clássico do prisma óptico que decompõe a luz branca.",
      "Euler: 5 + 6 − 9 = 2.",
    ],
  },
  {
    id: "prisma-hexagonal",
    name: "Prisma hexagonal",
    family: "Prismas",
    desc: "Duas bases hexagonais regulares ligadas por seis retângulos.",
    params: [
      { key: "a", label: "Aresta da base (a)", min: 1, max: 5, step: 0.1, def: 2.5 },
      { key: "h", label: "Altura (h)", min: 1, max: 10, step: 0.1, def: 6 },
    ],
    counts: () => ({ F: 8, E: 18, V: 12 }),
    measures: ({ a, h }) => {
      const ab = (3 * Math.sqrt(3) * a * a) / 2;
      return [
        { label: "Área da base", formula: "A_b = (3√3·a²)/2", value: round(ab), unit: "cm²" },
        { label: "Área lateral", formula: "A_l = 6·a·h", value: round(6 * a * h), unit: "cm²" },
        {
          label: "Área total",
          formula: "A_t = 2·A_b + A_l",
          value: round(2 * ab + 6 * a * h),
          unit: "cm²",
        },
        { label: "Volume", formula: "V = A_b·h", value: round(ab * h), unit: "cm³" },
      ];
    },
    net: ({ a, h }) => prismNet(6, a, h),
    geometry: ({ a, h }) => ({ type: "prism", r: a, h, seg: 6 }),
    facts: [
      "É a forma dos favos de mel: o hexágono cobre o plano sem deixar falhas.",
      "A faixa lateral tem largura 6a, o perímetro da base.",
      "Euler: 8 + 12 − 18 = 2.",
    ],
  },
  {
    id: "piramide-triangular",
    name: "Pirâmide triangular",
    family: "Pirâmides",
    desc: "Base triangular equilátera e três faces laterais triangulares.",
    params: [
      { key: "a", label: "Aresta da base (a)", min: 1, max: 8, step: 0.1, def: 4 },
      { key: "h", label: "Altura (h)", min: 1, max: 10, step: 0.1, def: 5 },
    ],
    counts: () => ({ F: 4, E: 6, V: 4 }),
    measures: ({ a, h }) => {
      const ab = (Math.sqrt(3) / 4) * a * a;
      const apo = a / (2 * Math.sqrt(3));
      const g = Math.hypot(h, apo);
      return [
        { label: "Área da base", formula: "A_b = (a²√3)/4", value: round(ab), unit: "cm²" },
        { label: "Apótema da pirâmide", formula: "g = √(h² + m²)", value: round(g), unit: "cm" },
        {
          label: "Área lateral",
          formula: "A_l = (3·a·g)/2",
          value: round((3 * a * g) / 2),
          unit: "cm²",
        },
        {
          label: "Área total",
          formula: "A_t = A_b + A_l",
          value: round(ab + (3 * a * g) / 2),
          unit: "cm²",
        },
        { label: "Volume", formula: "V = (A_b·h)/3", value: round((ab * h) / 3), unit: "cm³" },
      ];
    },
    net: ({ a, h }) => pyramidNet(3, a, h),
    geometry: ({ a, h }) => ({ type: "cone", r: a / Math.sqrt(3), h, seg: 3 }),
    facts: [
      "Quando todas as arestas são iguais ela é o tetraedro regular.",
      "A planificação tem a base no centro e três triângulos que se dobram para cima.",
      "Euler: 4 + 4 − 6 = 2.",
    ],
  },
  {
    id: "piramide-quadrangular",
    name: "Pirâmide quadrangular",
    family: "Pirâmides",
    desc: "Base quadrada e quatro faces laterais triangulares — a pirâmide do Egito.",
    params: [
      { key: "a", label: "Aresta da base (a)", min: 1, max: 8, step: 0.1, def: 5 },
      { key: "h", label: "Altura (h)", min: 1, max: 10, step: 0.1, def: 5 },
    ],
    counts: () => ({ F: 5, E: 8, V: 5 }),
    measures: ({ a, h }) => {
      const g = Math.hypot(h, a / 2);
      return [
        { label: "Área da base", formula: "A_b = a²", value: round(a * a), unit: "cm²" },
        { label: "Apótema da pirâmide", formula: "g = √(h² + (a/2)²)", value: round(g), unit: "cm" },
        { label: "Área lateral", formula: "A_l = 2·a·g", value: round(2 * a * g), unit: "cm²" },
        {
          label: "Área total",
          formula: "A_t = a² + 2·a·g",
          value: round(a * a + 2 * a * g),
          unit: "cm²",
        },
        { label: "Volume", formula: "V = (a²·h)/3", value: round((a * a * h) / 3), unit: "cm³" },
      ];
    },
    net: ({ a, h }) => pyramidNet(4, a, h),
    geometry: ({ a, h }) => ({ type: "cone", r: (a * Math.SQRT2) / 2, h, seg: 4 }),
    facts: [
      "A pirâmide de Quéops tem base de 230 m e altura original de 146 m.",
      "A planificação forma uma estrela de quatro pontas.",
      "Euler: 5 + 5 − 8 = 2.",
    ],
  },
  {
    id: "tetraedro",
    name: "Tetraedro regular",
    family: "Poliedros de Platão",
    desc: "Quatro faces triangulares equiláteras iguais.",
    params: [{ key: "a", label: "Aresta (a)", min: 1, max: 8, step: 0.1, def: 4 }],
    counts: () => ({ F: 4, E: 6, V: 4 }),
    measures: ({ a }) => [
      { label: "Área total", formula: "A = a²√3", value: round(a * a * Math.sqrt(3)), unit: "cm²" },
      {
        label: "Volume",
        formula: "V = a³/(6√2)",
        value: round(a ** 3 / (6 * Math.SQRT2)),
        unit: "cm³",
      },
      {
        label: "Altura",
        formula: "H = a·√(2/3)",
        value: round(a * Math.sqrt(2 / 3)),
        unit: "cm",
      },
    ],
    net: ({ a }) => {
      const ht = (Math.sqrt(3) / 2) * a;
      const big: Pt[] = [
        [0, ht],
        [a, ht],
        [a / 2, 0],
      ];
      const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const shapes: NetShape[] = [{ kind: "poly", points: big }];
      for (let i = 0; i < 3; i++) {
        shapes.push({
          kind: "poly",
          points: rotate180About(big, mid(big[i]!, big[(i + 1) % 3]!)),
        });
      }
      return shapes;
    },
    geometry: ({ a }) => ({ type: "poly", solid: "tetra", r: (a * Math.sqrt(6)) / 4 }),
    facts: [
      "É o poliedro com o menor número possível de faces.",
      "A planificação é um triângulo grande dividido em quatro triângulos iguais.",
      "É autodual: seu dual é outro tetraedro.",
    ],
  },
  {
    id: "dodecaedro",
    name: "Dodecaedro regular",
    family: "Poliedros de Platão",
    desc: "Doze faces pentagonais regulares.",
    params: [{ key: "a", label: "Aresta (a)", min: 0.5, max: 4, step: 0.1, def: 2 }],
    counts: () => ({ F: 12, E: 30, V: 20 }),
    measures: ({ a }) => [
      {
        label: "Área total",
        formula: "A = 3√(25 + 10√5)·a²",
        value: round(3 * Math.sqrt(25 + 10 * Math.sqrt(5)) * a * a),
        unit: "cm²",
      },
      {
        label: "Volume",
        formula: "V = ((15 + 7√5)/4)·a³",
        value: round(((15 + 7 * Math.sqrt(5)) / 4) * a ** 3),
        unit: "cm³",
      },
      {
        label: "Raio da esfera circunscrita",
        formula: "R = (a√3/4)(1 + √5)",
        value: round(((a * Math.sqrt(3)) / 4) * (1 + Math.sqrt(5))),
        unit: "cm",
      },
    ],
    net: ({ a }) => {
      // duas "flores" de 6 pentágonos cada (12 faces), lado a lado, sem sobreposição
      const f1 = pentagonFlower(a, 0, 0, -90);
      const f2 = pentagonFlower(a, 0, 0, 90);
      const xs = (shapes: NetShape[]) =>
        shapes.flatMap((sh) => (sh.kind === "poly" ? sh.points.map((pt) => pt[0]) : []));
      const gap = a * 0.35;
      const dx = Math.max(...xs(f1)) - Math.min(...xs(f2)) + gap;
      return [
        ...f1,
        ...f2.map((sh) =>
          sh.kind === "poly"
            ? { kind: "poly" as const, points: sh.points.map(([x, y]) => [x + dx, y] as Pt) }
            : sh,
        ),
      ];
    },
    geometry: ({ a }) => ({
      type: "poly",
      solid: "dodeca",
      r: ((a * Math.sqrt(3)) / 4) * (1 + Math.sqrt(5)),
    }),
    facts: [
      "A planificação são duas 'flores' de 6 pentágonos: uma vira a tampa, a outra o fundo.",
      "Tem 12 faces, 30 arestas e 20 vértices — Euler: 12 + 20 − 30 = 2.",
      "É o dual do icosaedro.",
    ],
  },
  {
    id: "icosaedro",
    name: "Icosaedro regular",
    family: "Poliedros de Platão",
    desc: "Vinte faces triangulares equiláteras.",
    params: [{ key: "a", label: "Aresta (a)", min: 0.5, max: 4, step: 0.1, def: 2 }],
    counts: () => ({ F: 20, E: 30, V: 12 }),
    measures: ({ a }) => [
      {
        label: "Área total",
        formula: "A = 5√3·a²",
        value: round(5 * Math.sqrt(3) * a * a),
        unit: "cm²",
      },
      {
        label: "Volume",
        formula: "V = (5(3 + √5)/12)·a³",
        value: round(((5 * (3 + Math.sqrt(5))) / 12) * a ** 3),
        unit: "cm³",
      },
      {
        label: "Raio da esfera circunscrita",
        formula: "R = (a/4)√(10 + 2√5)",
        value: round((a / 4) * Math.sqrt(10 + 2 * Math.sqrt(5))),
        unit: "cm",
      },
    ],
    net: ({ a }) => {
      const ht = (Math.sqrt(3) / 2) * a;
      const shapes: NetShape[] = [];
      for (let k = 0; k < 10; k++) {
        if (k % 2 === 0) {
          const x = (k / 2) * a;
          shapes.push({
            kind: "poly",
            points: [
              [x, 2 * ht],
              [x + a, 2 * ht],
              [x + a / 2, ht],
            ],
          });
          shapes.push({
            kind: "poly",
            points: [
              [x, 2 * ht],
              [x + a, 2 * ht],
              [x + a / 2, 3 * ht],
            ],
          });
        } else {
          const x = ((k - 1) / 2) * a + a / 2;
          shapes.push({
            kind: "poly",
            points: [
              [x, ht],
              [x + a, ht],
              [x + a / 2, 2 * ht],
            ],
          });
          shapes.push({
            kind: "poly",
            points: [
              [x, ht],
              [x + a, ht],
              [x + a / 2, 0],
            ],
          });
        }
      }
      return shapes;
    },
    geometry: ({ a }) => ({
      type: "poly",
      solid: "icosa",
      r: (a / 4) * Math.sqrt(10 + 2 * Math.sqrt(5)),
    }),
    facts: [
      "A planificação é uma faixa de 10 triângulos com 5 acima e 5 abaixo.",
      "É o dado de 20 lados (d20) dos jogos de RPG.",
      "Euler: 20 + 12 − 30 = 2.",
    ],
  },
];

export const defaultsFor = (s: Solid): Rec =>
  Object.fromEntries(s.params.map((p) => [p.key, p.def])) as Rec;
