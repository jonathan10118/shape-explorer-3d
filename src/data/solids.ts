export type Pt = [number, number];

export type NetShape =
  | { kind: "poly"; points: Pt[]; role?: "base" | "lateral" }
  | { kind: "circle"; cx: number; cy: number; r: number; role?: "base" | "lateral" }
  | {
      kind: "sector";
      cx: number;
      cy: number;
      r: number;
      start: number;
      end: number;
      role?: "base" | "lateral";
    };

export type ParamDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
};

export type Measure = { label: string; formula: string; value: number; unit: string };

export type SolidDef = {
  id: string;
  name: string;
  family: string;
  description: string;
  params: ParamDef[];
  counts: { faces: number; edges: number; vertices: number } | null;
  facts: string[];
  measures: (p: Record<string, number>) => Measure[];
  net: (p: Record<string, number>) => NetShape[];
};

/* ---------- helpers geométricos ---------- */

const rot = (v: Pt, a: number): Pt => [
  v[0] * Math.cos(a) - v[1] * Math.sin(a),
  v[0] * Math.sin(a) + v[1] * Math.cos(a),
];

/** Polígono regular de n lados construído sobre a aresta a->b. */
export function polyOnEdge(a: Pt, b: Pt, n: number): Pt[] {
  const step = (2 * Math.PI) / n;
  const pts: Pt[] = [a, b];
  let d: Pt = [b[0] - a[0], b[1] - a[1]];
  let cur: Pt = b;
  for (let i = 0; i < n - 2; i++) {
    d = rot(d, step);
    cur = [cur[0] + d[0], cur[1] + d[1]];
    pts.push(cur);
  }
  return pts;
}

/** Triângulo isósceles de base a->b e altura `hgt` (do lado oposto ao giro +). */
function triOnEdge(a: Pt, b: Pt, hgt: number): Pt[] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return [a, b, [mx + nx * hgt, my + ny * hgt]];
}

function regularPolygon(cx: number, cy: number, r: number, n: number, offset = -Math.PI / 2): Pt[] {
  return Array.from({ length: n }, (_, i): Pt => {
    const a = offset + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

const rectPts = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

/** Planificação de prisma reto de base n-gonal regular. */
function prismNet(n: number, s: number, h: number): NetShape[] {
  const shapes: NetShape[] = [];
  for (let i = 0; i < n; i++) {
    shapes.push({ kind: "poly", points: rectPts(i * s, 0, s, h), role: "lateral" });
  }
  const k = Math.floor(n / 2) - (n % 2 === 0 ? 1 : 0);
  // base superior: acima do retângulo k
  shapes.push({
    kind: "poly",
    points: polyOnEdge([(k + 1) * s, 0], [k * s, 0], n),
    role: "base",
  });
  // base inferior: abaixo do retângulo k
  shapes.push({
    kind: "poly",
    points: polyOnEdge([k * s, h], [(k + 1) * s, h], n),
    role: "base",
  });
  return shapes;
}

/** Planificação de pirâmide reta de base n-gonal regular. */
function pyramidNet(n: number, s: number, h: number): NetShape[] {
  const R = s / (2 * Math.sin(Math.PI / n));
  const apothem = s / (2 * Math.tan(Math.PI / n));
  const slant = Math.sqrt(h * h + apothem * apothem);
  const base = regularPolygon(0, 0, R, n);
  const shapes: NetShape[] = [{ kind: "poly", points: base, role: "base" }];
  for (let i = 0; i < n; i++) {
    const a = base[i];
    const b = base[(i + 1) % n];
    // normal apontando para fora do polígono
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const out = Math.hypot(mx, my) > 0 ? 1 : 1;
    const tri = triOnEdge(a, b, slant);
    const apex = tri[2];
    const outward = Math.hypot(apex[0], apex[1]) > Math.hypot(mx, my);
    shapes.push({
      kind: "poly",
      points: outward ? tri : triOnEdge(b, a, slant * out),
      role: "lateral",
    });
  }
  return shapes;
}

/** Planificação do dodecaedro: duas "flores" unidas por uma aresta (rede única). */
function dodecaNet(s: number): NetShape[] {
  const shapes: NetShape[] = [];
  const push = (pts: Pt[], role: "base" | "lateral") =>
    shapes.push({ kind: "poly", points: pts, role });

  // Flor A
  const centerA = polyOnEdge([0, 0], [s, 0], 5);
  push(centerA, "base");
  const petals: Pt[][] = [];
  for (let i = 0; i < 5; i++) {
    const a = centerA[i];
    const b = centerA[(i + 1) % 5];
    const petal = polyOnEdge(b, a, 5);
    petals.push(petal);
    push(petal, "lateral");
  }

  // Ponte: pentágono colado na aresta externa de uma pétala (pontas unidas)
  const p = petals[0];
  const bridge = polyOnEdge(p[3], p[2], 5);
  push(bridge, "lateral");

  // Flor B: centro colado na ponte + 4 pétalas restantes
  const centerB = polyOnEdge(bridge[3], bridge[2], 5);
  push(centerB, "base");
  for (let i = 1; i < 5; i++) {
    const a = centerB[i];
    const b = centerB[(i + 1) % 5];
    push(polyOnEdge(b, a, 5), "lateral");
  }
  return shapes;
}

/** Planificação do icosaedro: faixa antiprismática de 10 triângulos + 5 calotas em cada lado. */
function icosaNet(s: number): NetShape[] {
  const h = (s * Math.sqrt(3)) / 2;
  const shapes: NetShape[] = [];
  for (let i = 0; i < 10; i++) {
    const x = (i * s) / 2;
    if (i % 2 === 0) {
      shapes.push({
        kind: "poly",
        points: [
          [x, h],
          [x + s, h],
          [x + s / 2, 0],
        ],
        role: "lateral",
      });
    } else {
      shapes.push({
        kind: "poly",
        points: [
          [x, 0],
          [x + s, 0],
          [x + s / 2, h],
        ],
        role: "lateral",
      });
    }
  }
  for (let i = 0; i < 5; i++) {
    const x = i * s;
    // calota superior sobre triângulo apontado para cima
    shapes.push({
      kind: "poly",
      points: [
        [x + s / 2, 0],
        [x + s * 1.5, 0],
        [x + s, -h],
      ],
      role: "base",
    });
    // calota inferior
    shapes.push({
      kind: "poly",
      points: [
        [x, h],
        [x + s, h],
        [x + s / 2, 2 * h],
      ],
      role: "base",
    });
  }
  return shapes;
}

const fmt = (n: number) => n;

/* ---------- definições dos sólidos ---------- */

export const SOLIDS: SolidDef[] = [
  {
    id: "cone",
    name: "Cone",
    family: "Corpos redondos",
    description:
      "Sólido gerado pela rotação de um triângulo retângulo em torno de um cateto. Tem uma base circular e uma superfície lateral curva que termina no vértice.",
    params: [
      { key: "r", label: "Raio da base (r)", min: 1, max: 6, step: 0.1, def: 2 },
      { key: "h", label: "Altura (h)", min: 1, max: 10, step: 0.1, def: 4 },
    ],
    counts: null,
    facts: [
      "A geratriz vale g = √(r² + h²).",
      "A planificação lateral é um setor circular de raio g.",
      "O volume do cone é 1/3 do volume do cilindro de mesma base e altura.",
    ],
    measures: ({ r, h }) => {
      const g = Math.hypot(r, h);
      return [
        { label: "Geratriz", formula: "g = √(r² + h²)", value: fmt(g), unit: "cm" },
        { label: "Área da base", formula: "A_b = π·r²", value: Math.PI * r * r, unit: "cm²" },
        { label: "Área lateral", formula: "A_l = π·r·g", value: Math.PI * r * g, unit: "cm²" },
        {
          label: "Área total",
          formula: "A_t = π·r·(r + g)",
          value: Math.PI * r * (r + g),
          unit: "cm²",
        },
        {
          label: "Volume",
          formula: "V = (π·r²·h)/3",
          value: (Math.PI * r * r * h) / 3,
          unit: "cm³",
        },
      ];
    },
    net: ({ r, h }) => {
      const g = Math.hypot(r, h);
      const theta = (2 * Math.PI * r) / g; // ângulo do setor
      const start = -Math.PI / 2 - theta / 2;
      const end = start + theta;
      return [
        { kind: "sector", cx: 0, cy: 0, r: g, start, end, role: "lateral" },
        { kind: "circle", cx: 0, cy: -g - r, r, role: "base" },
      ];
    },
  },
  {
    id: "cilindro",
    name: "Cilindro",
    family: "Corpos redondos",
    description:
      "Sólido de revolução com duas bases circulares paralelas e congruentes, ligadas por uma superfície lateral que se planifica como um retângulo.",
    params: [
      { key: "r", label: "Raio da base (r)", min: 1, max: 6, step: 0.1, def: 2 },
      { key: "h", label: "Altura (h)", min: 1, max: 10, step: 0.1, def: 4 },
    ],
    counts: null,
    facts: [
      "A largura do retângulo lateral é o perímetro da base: 2πr.",
      "Se h = 2r, o cilindro é equilátero.",
      "Volume = área da base × altura.",
    ],
    measures: ({ r, h }) => [
      { label: "Perímetro da base", formula: "P = 2·π·r", value: 2 * Math.PI * r, unit: "cm" },
      { label: "Área da base", formula: "A_b = π·r²", value: Math.PI * r * r, unit: "cm²" },
      { label: "Área lateral", formula: "A_l = 2·π·r·h", value: 2 * Math.PI * r * h, unit: "cm²" },
      {
        label: "Área total",
        formula: "A_t = 2·π·r·(r + h)",
        value: 2 * Math.PI * r * (r + h),
        unit: "cm²",
      },
      { label: "Volume", formula: "V = π·r²·h", value: Math.PI * r * r * h, unit: "cm³" },
    ],
    net: ({ r, h }) => {
      const w = 2 * Math.PI * r;
      return [
        { kind: "poly", points: rectPts(0, 0, w, h), role: "lateral" },
        { kind: "circle", cx: w / 2, cy: -r, r, role: "base" },
        { kind: "circle", cx: w / 2, cy: h + r, r, role: "base" },
      ];
    },
  },
  {
    id: "paralelepipedo",
    name: "Paralelepípedo",
    family: "Prismas",
    description:
      "Prisma reto de base retangular. Todas as seis faces são retângulos e as faces opostas são congruentes.",
    params: [
      { key: "a", label: "Comprimento (a)", min: 1, max: 8, step: 0.1, def: 4 },
      { key: "b", label: "Largura (b)", min: 1, max: 8, step: 0.1, def: 2.5 },
      { key: "c", label: "Altura (c)", min: 1, max: 8, step: 0.1, def: 3 },
    ],
    counts: { faces: 6, edges: 12, vertices: 8 },
    facts: [
      "A diagonal do bloco vale D = √(a² + b² + c²).",
      "É o sólido do dia a dia: caixas, tijolos e livros.",
    ],
    measures: ({ a, b, c }) => [
      {
        label: "Diagonal",
        formula: "D = √(a² + b² + c²)",
        value: Math.sqrt(a * a + b * b + c * c),
        unit: "cm",
      },
      {
        label: "Área lateral",
        formula: "A_l = 2·c·(a + b)",
        value: 2 * c * (a + b),
        unit: "cm²",
      },
      {
        label: "Área total",
        formula: "A_t = 2·(ab + ac + bc)",
        value: 2 * (a * b + a * c + b * c),
        unit: "cm²",
      },
      { label: "Volume", formula: "V = a·b·c", value: a * b * c, unit: "cm³" },
    ],
    net: ({ a, b, c }) => [
      { kind: "poly", points: rectPts(0, 0, b, c), role: "lateral" },
      { kind: "poly", points: rectPts(b, 0, a, c), role: "lateral" },
      { kind: "poly", points: rectPts(b + a, 0, b, c), role: "lateral" },
      { kind: "poly", points: rectPts(b + a + b, 0, a, c), role: "lateral" },
      { kind: "poly", points: rectPts(b, -b, a, b), role: "base" },
      { kind: "poly", points: rectPts(b, c, a, b), role: "base" },
    ],
  },
  {
    id: "cubo",
    name: "Cubo",
    family: "Poliedros de Platão",
    description:
      "Hexaedro regular: seis faces quadradas congruentes. É um dos cinco sólidos de Platão.",
    params: [{ key: "a", label: "Aresta (a)", min: 1, max: 8, step: 0.1, def: 3 }],
    counts: { faces: 6, edges: 12, vertices: 8 },
    facts: [
      "Existem 11 planificações diferentes para o cubo.",
      "A diagonal do cubo vale a√3.",
      "É o dual do octaedro.",
    ],
    measures: ({ a }) => [
      { label: "Diagonal da face", formula: "d = a√2", value: a * Math.SQRT2, unit: "cm" },
      { label: "Diagonal do cubo", formula: "D = a√3", value: a * Math.sqrt(3), unit: "cm" },
      { label: "Área total", formula: "A_t = 6·a²", value: 6 * a * a, unit: "cm²" },
      { label: "Volume", formula: "V = a³", value: a ** 3, unit: "cm³" },
    ],
    net: ({ a }) => [
      { kind: "poly", points: rectPts(0, 0, a, a), role: "lateral" },
      { kind: "poly", points: rectPts(a, 0, a, a), role: "lateral" },
      { kind: "poly", points: rectPts(2 * a, 0, a, a), role: "lateral" },
      { kind: "poly", points: rectPts(3 * a, 0, a, a), role: "lateral" },
      { kind: "poly", points: rectPts(a, -a, a, a), role: "base" },
      { kind: "poly", points: rectPts(a, a, a, a), role: "base" },
    ],
  },
  {
    id: "prisma-triangular",
    name: "Prisma triangular",
    family: "Prismas",
    description:
      "Prisma reto com duas bases triangulares equiláteras e três faces laterais retangulares.",
    params: [
      { key: "a", label: "Aresta da base (a)", min: 1, max: 8, step: 0.1, def: 3 },
      { key: "h", label: "Altura (h)", min: 1, max: 10, step: 0.1, def: 5 },
    ],
    counts: { faces: 5, edges: 9, vertices: 6 },
    facts: [
      "A base equilátera tem área a²√3/4.",
      "É a forma clássica do prisma óptico que decompõe a luz.",
    ],
    measures: ({ a, h }) => {
      const ab = (a * a * Math.sqrt(3)) / 4;
      return [
        { label: "Área da base", formula: "A_b = a²√3/4", value: ab, unit: "cm²" },
        { label: "Área lateral", formula: "A_l = 3·a·h", value: 3 * a * h, unit: "cm²" },
        { label: "Área total", formula: "A_t = A_l + 2·A_b", value: 3 * a * h + 2 * ab, unit: "cm²" },
        { label: "Volume", formula: "V = A_b·h", value: ab * h, unit: "cm³" },
      ];
    },
    net: ({ a, h }) => prismNet(3, a, h),
  },
  {
    id: "prisma-hexagonal",
    name: "Prisma hexagonal",
    family: "Prismas",
    description:
      "Prisma reto com duas bases hexagonais regulares e seis faces laterais retangulares.",
    params: [
      { key: "a", label: "Aresta da base (a)", min: 1, max: 6, step: 0.1, def: 2 },
      { key: "h", label: "Altura (h)", min: 1, max: 10, step: 0.1, def: 5 },
    ],
    counts: { faces: 8, edges: 18, vertices: 12 },
    facts: [
      "A base hexagonal tem área 3a²√3/2.",
      "É a geometria dos favos de mel: máxima área com mínimo material.",
    ],
    measures: ({ a, h }) => {
      const ab = (3 * a * a * Math.sqrt(3)) / 2;
      return [
        { label: "Apótema da base", formula: "m = a√3/2", value: (a * Math.sqrt(3)) / 2, unit: "cm" },
        { label: "Área da base", formula: "A_b = 3a²√3/2", value: ab, unit: "cm²" },
        { label: "Área lateral", formula: "A_l = 6·a·h", value: 6 * a * h, unit: "cm²" },
        { label: "Área total", formula: "A_t = A_l + 2·A_b", value: 6 * a * h + 2 * ab, unit: "cm²" },
        { label: "Volume", formula: "V = A_b·h", value: ab * h, unit: "cm³" },
      ];
    },
    net: ({ a, h }) => prismNet(6, a, h),
  },
  {
    id: "piramide-triangular",
    name: "Pirâmide triangular",
    family: "Pirâmides",
    description:
      "Pirâmide de base triangular equilátera com três faces laterais triangulares que se encontram no vértice.",
    params: [
      { key: "a", label: "Aresta da base (a)", min: 1, max: 8, step: 0.1, def: 3 },
      { key: "h", label: "Altura (h)", min: 1, max: 10, step: 0.1, def: 4 },
    ],
    counts: { faces: 4, edges: 6, vertices: 4 },
    facts: [
      "Quando todas as arestas são iguais, ela é um tetraedro regular.",
      "O apótema da pirâmide vale √(h² + m²), com m = apótema da base.",
    ],
    measures: ({ a, h }) => {
      const m = a / (2 * Math.sqrt(3));
      const ap = Math.hypot(h, m);
      const ab = (a * a * Math.sqrt(3)) / 4;
      return [
        { label: "Apótema da base", formula: "m = a√3/6", value: m, unit: "cm" },
        { label: "Apótema da pirâmide", formula: "g = √(h² + m²)", value: ap, unit: "cm" },
        { label: "Área da base", formula: "A_b = a²√3/4", value: ab, unit: "cm²" },
        { label: "Área lateral", formula: "A_l = 3·(a·g)/2", value: (3 * a * ap) / 2, unit: "cm²" },
        {
          label: "Área total",
          formula: "A_t = A_l + A_b",
          value: (3 * a * ap) / 2 + ab,
          unit: "cm²",
        },
        { label: "Volume", formula: "V = (A_b·h)/3", value: (ab * h) / 3, unit: "cm³" },
      ];
    },
    net: ({ a, h }) => pyramidNet(3, a, h),
  },
  {
    id: "piramide-quadrangular",
    name: "Pirâmide quadrangular",
    family: "Pirâmides",
    description:
      "Pirâmide de base quadrada com quatro faces laterais triangulares — a forma das pirâmides do Egito.",
    params: [
      { key: "a", label: "Aresta da base (a)", min: 1, max: 8, step: 0.1, def: 4 },
      { key: "h", label: "Altura (h)", min: 1, max: 10, step: 0.1, def: 4 },
    ],
    counts: { faces: 5, edges: 8, vertices: 5 },
    facts: [
      "O apótema da pirâmide vale √(h² + (a/2)²).",
      "A pirâmide de Quéops tem base de 230 m e altura original de 146 m.",
    ],
    measures: ({ a, h }) => {
      const ap = Math.hypot(h, a / 2);
      return [
        { label: "Apótema da pirâmide", formula: "g = √(h² + (a/2)²)", value: ap, unit: "cm" },
        { label: "Área da base", formula: "A_b = a²", value: a * a, unit: "cm²" },
        { label: "Área lateral", formula: "A_l = 2·a·g", value: 2 * a * ap, unit: "cm²" },
        { label: "Área total", formula: "A_t = a² + 2·a·g", value: a * a + 2 * a * ap, unit: "cm²" },
        { label: "Volume", formula: "V = (a²·h)/3", value: (a * a * h) / 3, unit: "cm³" },
      ];
    },
    net: ({ a, h }) => pyramidNet(4, a, h),
  },
  {
    id: "tetraedro",
    name: "Tetraedro regular",
    family: "Poliedros de Platão",
    description:
      "Poliedro de Platão formado por quatro triângulos equiláteros congruentes. É a pirâmide mais simples que existe.",
    params: [{ key: "a", label: "Aresta (a)", min: 1, max: 8, step: 0.1, def: 3 }],
    counts: { faces: 4, edges: 6, vertices: 4 },
    facts: [
      "Altura = a√6/3.",
      "É o único sólido de Platão que é dual de si mesmo.",
      "Sua planificação é um triângulo dividido em quatro.",
    ],
    measures: ({ a }) => [
      { label: "Altura", formula: "H = a√6/3", value: (a * Math.sqrt(6)) / 3, unit: "cm" },
      { label: "Área total", formula: "A_t = a²√3", value: a * a * Math.sqrt(3), unit: "cm²" },
      { label: "Volume", formula: "V = a³√2/12", value: (a ** 3 * Math.SQRT2) / 12, unit: "cm³" },
    ],
    net: ({ a }) => {
      const h = (a * Math.sqrt(3)) / 2;
      const A: Pt = [0, h];
      const B: Pt = [a, h];
      const C: Pt = [2 * a, h];
      const D: Pt = [a / 2, 0];
      const E: Pt = [(3 * a) / 2, 0];
      const F: Pt = [a, 2 * h];
      return [
        { kind: "poly", points: [A, B, D], role: "lateral" },
        { kind: "poly", points: [B, C, E], role: "lateral" },
        { kind: "poly", points: [D, E, B], role: "base" },
        { kind: "poly", points: [A, B, F], role: "lateral" },
      ];
    },
  },
  {
    id: "dodecaedro",
    name: "Dodecaedro regular",
    family: "Poliedros de Platão",
    description:
      "Poliedro de Platão com doze faces pentagonais regulares. Sua planificação clássica são duas 'flores' de seis pentágonos unidas por uma aresta.",
    params: [{ key: "a", label: "Aresta (a)", min: 1, max: 5, step: 0.1, def: 2 }],
    counts: { faces: 12, edges: 30, vertices: 20 },
    facts: [
      "Em cada vértice encontram-se 3 pentágonos.",
      "É o dual do icosaedro.",
      "Platão o associava ao cosmos.",
    ],
    measures: ({ a }) => [
      {
        label: "Área total",
        formula: "A_t = 3a²√(25 + 10√5)",
        value: 3 * a * a * Math.sqrt(25 + 10 * Math.sqrt(5)),
        unit: "cm²",
      },
      {
        label: "Volume",
        formula: "V = a³(15 + 7√5)/4",
        value: (a ** 3 * (15 + 7 * Math.sqrt(5))) / 4,
        unit: "cm³",
      },
      {
        label: "Raio da esfera circunscrita",
        formula: "R = (a√3/4)(1 + √5)",
        value: ((a * Math.sqrt(3)) / 4) * (1 + Math.sqrt(5)),
        unit: "cm",
      },
    ],
    net: ({ a }) => dodecaNet(a),
  },
  {
    id: "icosaedro",
    name: "Icosaedro regular",
    family: "Poliedros de Platão",
    description:
      "Poliedro de Platão com vinte faces triangulares equiláteras. Sua planificação é uma faixa de dez triângulos com cinco calotas em cada lado.",
    params: [{ key: "a", label: "Aresta (a)", min: 1, max: 5, step: 0.1, def: 2 }],
    counts: { faces: 20, edges: 30, vertices: 12 },
    facts: [
      "Em cada vértice encontram-se 5 triângulos.",
      "É o dual do dodecaedro.",
      "Muitos vírus têm capsídeo icosaédrico.",
    ],
    measures: ({ a }) => [
      {
        label: "Área total",
        formula: "A_t = 5a²√3",
        value: 5 * a * a * Math.sqrt(3),
        unit: "cm²",
      },
      {
        label: "Volume",
        formula: "V = (5/12)a³(3 + √5)",
        value: (5 / 12) * a ** 3 * (3 + Math.sqrt(5)),
        unit: "cm³",
      },
      {
        label: "Raio da esfera circunscrita",
        formula: "R = (a/4)√(10 + 2√5)",
        value: (a / 4) * Math.sqrt(10 + 2 * Math.sqrt(5)),
        unit: "cm",
      },
    ],
    net: ({ a }) => icosaNet(a),
  },
];

export const FAMILIES = Array.from(new Set(SOLIDS.map((s) => s.family)));
