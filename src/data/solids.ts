export type ParamKey = "r" | "h" | "a" | "b" | "c" | "l" | "g";

export type SolidParam = {
  key: ParamKey;
  label: string;
  default: number;
  min: number;
  max: number;
  step: number;
};

export type Net =
  | { type: "poly"; points: [number, number][]; label?: string }
  | { type: "circle"; cx: number; cy: number; r: number; label?: string }
  | {
      type: "sector";
      cx: number;
      cy: number;
      r: number;
      start: number;
      sweep: number;
      label?: string | undefined;
    };

export type Params = Record<ParamKey, number>;

export type Measure = { label: string; formula: string; value: number; unit: string };

export type SolidDef = {
  id: string;
  name: string;
  family: "Corpos redondos" | "Prismas" | "Pirâmides" | "Poliedros de Platão";
  tagline: string;
  params: SolidParam[];
  counts: (p: Params) => { faces: number; edges: number; vertices: number };
  measures: (p: Params) => Measure[];
  facts: string[];
  net: (p: Params) => Net[];
  geometry: (p: Params) =>
    | { kind: "box"; args: [number, number, number] }
    | { kind: "cylinder"; args: [number, number, number, number] }
    | { kind: "cone"; args: [number, number, number] }
    | { kind: "platonic"; solid: "tetra" | "dodeca" | "icosa"; radius: number };
};

const P = (key: ParamKey, label: string, def: number, min = 0.5, max = 6, step = 0.1): SolidParam => ({
  key,
  label,
  default: def,
  min,
  max,
  step,
});

const TAU = Math.PI * 2;

/** Vertices of a regular n-gon with circumradius R, centered at (cx, cy). */
function ngon(n: number, R: number, cx = 0, cy = 0, rot = -Math.PI / 2): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i * TAU) / n;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as [number, number];
  });
}

function rect(x: number, y: number, w: number, h: number, label?: string): Net {
  return {
    type: "poly",
    points: [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    label,
  };
}

/** Apothem of a regular n-gon from its side length. */
const apothem = (n: number, side: number) => side / (2 * Math.tan(Math.PI / n));
/** Circumradius of a regular n-gon from its side length. */
const circumradius = (n: number, side: number) => side / (2 * Math.sin(Math.PI / n));

const round = (v: number) => Math.round(v * 1000) / 1000;

export const SOLIDS: SolidDef[] = [
  {
    id: "cone",
    name: "Cone",
    family: "Corpos redondos",
    tagline: "Base circular e uma superfície lateral que converge no vértice.",
    params: [P("r", "Raio da base (r)", 2), P("h", "Altura (h)", 3.5)],
    counts: () => ({ faces: 2, edges: 1, vertices: 1 }),
    measures: ({ r, h }) => {
      const g = Math.sqrt(r * r + h * h);
      return [
        { label: "Geratriz", formula: "g = √(r² + h²)", value: round(g), unit: "u" },
        { label: "Área da base", formula: "A_b = πr²", value: round(Math.PI * r * r), unit: "u²" },
        { label: "Área lateral", formula: "A_l = πrg", value: round(Math.PI * r * g), unit: "u²" },
        {
          label: "Área total",
          formula: "A_t = πr(r + g)",
          value: round(Math.PI * r * (r + g)),
          unit: "u²",
        },
        {
          label: "Volume",
          formula: "V = (1/3)πr²h",
          value: round((Math.PI * r * r * h) / 3),
          unit: "u³",
        },
      ];
    },
    facts: [
      "É um sólido de revolução: nasce ao girar um triângulo retângulo em torno de um cateto.",
      "A planificação lateral é um setor circular de raio g e arco 2πr.",
      "Seu volume é exatamente 1/3 do cilindro de mesma base e altura.",
    ],
    net: ({ r, h }) => {
      const g = Math.sqrt(r * r + h * h);
      const sweep = (TAU * r) / g;
      return [
        { type: "sector", cx: 0, cy: 0, r: g, start: -Math.PI / 2 - sweep / 2, sweep, label: "setor (lateral)" },
        { type: "circle", cx: 0, cy: g * 0.55 + r, r, label: "base" },
      ];
    },
    geometry: ({ r, h }) => ({ kind: "cone", args: [r, h, 64] }),
  },
  {
    id: "cilindro",
    name: "Cilindro",
    family: "Corpos redondos",
    tagline: "Duas bases circulares paralelas ligadas por uma superfície curva.",
    params: [P("r", "Raio da base (r)", 1.6), P("h", "Altura (h)", 3.4)],
    counts: () => ({ faces: 3, edges: 2, vertices: 0 }),
    measures: ({ r, h }) => [
      { label: "Área da base", formula: "A_b = πr²", value: round(Math.PI * r * r), unit: "u²" },
      { label: "Área lateral", formula: "A_l = 2πrh", value: round(TAU * r * h), unit: "u²" },
      {
        label: "Área total",
        formula: "A_t = 2πr(r + h)",
        value: round(TAU * r * (r + h)),
        unit: "u²",
      },
      { label: "Volume", formula: "V = πr²h", value: round(Math.PI * r * r * h), unit: "u³" },
    ],
    facts: [
      "Também é sólido de revolução: gira-se um retângulo em torno de um de seus lados.",
      "A superfície lateral planificada é um retângulo de base 2πr e altura h.",
      "Cilindro equilátero é aquele em que h = 2r.",
    ],
    net: ({ r, h }) => {
      const w = TAU * r;
      return [
        rect(-w / 2, -h / 2, w, h, "lateral: 2πr × h"),
        { type: "circle", cx: 0, cy: -h / 2 - r - 0.4, r, label: "base" },
        { type: "circle", cx: 0, cy: h / 2 + r + 0.4, r, label: "base" },
      ];
    },
    geometry: ({ r, h }) => ({ kind: "cylinder", args: [r, r, h, 64] }),
  },
  {
    id: "paralelepipedo",
    name: "Paralelepípedo",
    family: "Prismas",
    tagline: "Prisma reto de base retangular — a caixa clássica.",
    params: [P("a", "Comprimento (a)", 3), P("b", "Largura (b)", 2), P("c", "Altura (c)", 1.6)],
    counts: () => ({ faces: 6, edges: 12, vertices: 8 }),
    measures: ({ a, b, c }) => [
      {
        label: "Área total",
        formula: "A_t = 2(ab + ac + bc)",
        value: round(2 * (a * b + a * c + b * c)),
        unit: "u²",
      },
      { label: "Volume", formula: "V = a·b·c", value: round(a * b * c), unit: "u³" },
      {
        label: "Diagonal",
        formula: "D = √(a² + b² + c²)",
        value: round(Math.sqrt(a * a + b * b + c * c)),
        unit: "u",
      },
      { label: "Soma das arestas", formula: "S = 4(a + b + c)", value: round(4 * (a + b + c)), unit: "u" },
    ],
    facts: [
      "Todas as faces são retângulos e as opostas são congruentes.",
      "Satisfaz a relação de Euler: 6 + 8 − 12 = 2.",
      "Quando a = b = c, o paralelepípedo vira um cubo.",
    ],
    net: ({ a, b, c }) => [
      rect(-a / 2, -c / 2, a, c, "frente"),
      rect(a / 2, -c / 2, b, c, "lateral"),
      rect(-a / 2 - b, -c / 2, b, c, "lateral"),
      rect(a / 2 + b, -c / 2, a, c, "trás"),
      rect(-a / 2, -c / 2 - b, a, b, "topo"),
      rect(-a / 2, c / 2, a, b, "base"),
    ],
    geometry: ({ a, b, c }) => ({ kind: "box", args: [a, c, b] }),
  },
  {
    id: "prisma-triangular",
    name: "Prisma triangular",
    family: "Prismas",
    tagline: "Duas bases triangulares equiláteras e três faces retangulares.",
    params: [P("a", "Aresta da base (a)", 2.2), P("h", "Altura (h)", 3.2)],
    counts: () => ({ faces: 5, edges: 9, vertices: 6 }),
    measures: ({ a, h }) => {
      const ab = (Math.sqrt(3) / 4) * a * a;
      return [
        { label: "Área da base", formula: "A_b = (a²√3)/4", value: round(ab), unit: "u²" },
        { label: "Área lateral", formula: "A_l = 3ah", value: round(3 * a * h), unit: "u²" },
        { label: "Área total", formula: "A_t = 2A_b + A_l", value: round(2 * ab + 3 * a * h), unit: "u²" },
        { label: "Volume", formula: "V = A_b · h", value: round(ab * h), unit: "u³" },
      ];
    },
    facts: [
      "A planificação é formada por 3 retângulos lado a lado e 2 triângulos nas pontas.",
      "É o formato usado nos prismas ópticos que decompõem a luz branca.",
      "Euler: 5 + 6 − 9 = 2.",
    ],
    net: ({ a, h }) => {
      const ht = (Math.sqrt(3) / 2) * a;
      const shapes: Net[] = [];
      for (let i = 0; i < 3; i++) shapes.push(rect(-1.5 * a + i * a, -h / 2, a, h, "face"));
      shapes.push({
        type: "poly",
        points: [
          [-a / 2, -h / 2],
          [a / 2, -h / 2],
          [0, -h / 2 - ht],
        ],
        label: "base",
      });
      shapes.push({
        type: "poly",
        points: [
          [-a / 2, h / 2],
          [a / 2, h / 2],
          [0, h / 2 + ht],
        ],
        label: "base",
      });
      return shapes;
    },
    geometry: ({ a, h }) => ({ kind: "cylinder", args: [circumradius(3, a), circumradius(3, a), h, 3] }),
  },
  {
    id: "prisma-hexagonal",
    name: "Prisma hexagonal",
    family: "Prismas",
    tagline: "Bases hexagonais regulares — a geometria das colmeias.",
    params: [P("a", "Aresta da base (a)", 1.3), P("h", "Altura (h)", 3.2)],
    counts: () => ({ faces: 8, edges: 18, vertices: 12 }),
    measures: ({ a, h }) => {
      const ab = (3 * Math.sqrt(3) * a * a) / 2;
      return [
        { label: "Área da base", formula: "A_b = 3a²√3/2", value: round(ab), unit: "u²" },
        { label: "Apótema da base", formula: "m = a√3/2", value: round(apothem(6, a)), unit: "u" },
        { label: "Área lateral", formula: "A_l = 6ah", value: round(6 * a * h), unit: "u²" },
        { label: "Área total", formula: "A_t = 2A_b + A_l", value: round(2 * ab + 6 * a * h), unit: "u²" },
        { label: "Volume", formula: "V = A_b · h", value: round(ab * h), unit: "u³" },
      ];
    },
    facts: [
      "O hexágono regular é o polígono que preenche o plano com menor perímetro por área.",
      "Planificado: 6 retângulos em faixa mais 2 hexágonos.",
      "Euler: 8 + 12 − 18 = 2.",
    ],
    net: ({ a, h }) => {
      const R = circumradius(6, a);
      const shapes: Net[] = [];
      for (let i = 0; i < 6; i++) shapes.push(rect(-3 * a + i * a, -h / 2, a, h, "face"));
      shapes.push({ type: "poly", points: ngon(6, R, -2.5 * a + a / 2, -h / 2 - R, 0), label: "base" });
      shapes.push({ type: "poly", points: ngon(6, R, -2.5 * a + a / 2, h / 2 + R, 0), label: "base" });
      return shapes;
    },
    geometry: ({ a, h }) => ({ kind: "cylinder", args: [circumradius(6, a), circumradius(6, a), h, 6] }),
  },
  {
    id: "piramide-triangular",
    name: "Pirâmide triangular",
    family: "Pirâmides",
    tagline: "Base triangular equilátera e três faces laterais que se encontram no ápice.",
    params: [P("a", "Aresta da base (a)", 2.4), P("h", "Altura (h)", 3)],
    counts: () => ({ faces: 4, edges: 6, vertices: 4 }),
    measures: ({ a, h }) => {
      const ab = (Math.sqrt(3) / 4) * a * a;
      const m = apothem(3, a);
      const ap = Math.sqrt(h * h + m * m);
      return [
        { label: "Área da base", formula: "A_b = (a²√3)/4", value: round(ab), unit: "u²" },
        { label: "Apótema da pirâmide", formula: "g = √(h² + m²)", value: round(ap), unit: "u" },
        { label: "Área lateral", formula: "A_l = 3·(a·g)/2", value: round((3 * a * ap) / 2), unit: "u²" },
        { label: "Área total", formula: "A_t = A_b + A_l", value: round(ab + (3 * a * ap) / 2), unit: "u²" },
        { label: "Volume", formula: "V = (A_b·h)/3", value: round((ab * h) / 3), unit: "u³" },
      ];
    },
    facts: [
      "Toda pirâmide triangular é um tetraedro; se for regular em tudo, é o tetraedro de Platão.",
      "A planificação tem a base ao centro e três triângulos isósceles dobráveis.",
      "Volume é 1/3 do prisma de mesma base e altura.",
    ],
    net: ({ a, h }) => {
      const m = apothem(3, a);
      const R = circumradius(3, a);
      const ap = Math.sqrt(h * h + m * m);
      const base = ngon(3, R, 0, 0, -Math.PI / 2);
      const shapes: Net[] = [{ type: "poly", points: base, label: "base" }];
      for (let i = 0; i < 3; i++) {
        const p1 = base[i];
        const p2 = base[(i + 1) % 3];
        const mx = (p1[0] + p2[0]) / 2;
        const my = (p1[1] + p2[1]) / 2;
        const len = Math.hypot(mx, my) || 1;
        const tip: [number, number] = [(mx / len) * (m + ap), (my / len) * (m + ap)];
        shapes.push({ type: "poly", points: [p1, p2, tip], label: "face" });
      }
      return shapes;
    },
    geometry: ({ a, h }) => ({ kind: "cone", args: [circumradius(3, a), h, 3] }),
  },
  {
    id: "piramide-quadrangular",
    name: "Pirâmide quadrangular",
    family: "Pirâmides",
    tagline: "A forma das pirâmides de Gizé: base quadrada e quatro faces triangulares.",
    params: [P("a", "Aresta da base (a)", 2.6), P("h", "Altura (h)", 3)],
    counts: () => ({ faces: 5, edges: 8, vertices: 5 }),
    measures: ({ a, h }) => {
      const ap = Math.sqrt(h * h + (a / 2) * (a / 2));
      return [
        { label: "Área da base", formula: "A_b = a²", value: round(a * a), unit: "u²" },
        { label: "Apótema da pirâmide", formula: "g = √(h² + (a/2)²)", value: round(ap), unit: "u" },
        { label: "Área lateral", formula: "A_l = 2·a·g", value: round(2 * a * ap), unit: "u²" },
        { label: "Área total", formula: "A_t = a² + 2ag", value: round(a * a + 2 * a * ap), unit: "u²" },
        { label: "Volume", formula: "V = (a²·h)/3", value: round((a * a * h) / 3), unit: "u³" },
      ];
    },
    facts: [
      "A aresta lateral vale √(h² + a²/2), diferente do apótema da face.",
      "Planificada, lembra uma cruz de quatro triângulos ao redor de um quadrado.",
      "Euler: 5 + 5 − 8 = 2.",
    ],
    net: ({ a, h }) => {
      const ap = Math.sqrt(h * h + (a / 2) * (a / 2));
      const s = a / 2;
      return [
        rect(-s, -s, a, a, "base"),
        { type: "poly", points: [[-s, -s], [s, -s], [0, -s - ap]], label: "face" },
        { type: "poly", points: [[-s, s], [s, s], [0, s + ap]], label: "face" },
        { type: "poly", points: [[-s, -s], [-s, s], [-s - ap, 0]], label: "face" },
        { type: "poly", points: [[s, -s], [s, s], [s + ap, 0]], label: "face" },
      ];
    },
    geometry: ({ a, h }) => ({ kind: "cone", args: [circumradius(4, a), h, 4] }),
  },
  {
    id: "cubo",
    name: "Cubo",
    family: "Poliedros de Platão",
    tagline: "Hexaedro regular: seis quadrados idênticos.",
    params: [P("a", "Aresta (a)", 2.4)],
    counts: () => ({ faces: 6, edges: 12, vertices: 8 }),
    measures: ({ a }) => [
      { label: "Área de uma face", formula: "A_f = a²", value: round(a * a), unit: "u²" },
      { label: "Área total", formula: "A_t = 6a²", value: round(6 * a * a), unit: "u²" },
      { label: "Volume", formula: "V = a³", value: round(a ** 3), unit: "u³" },
      { label: "Diagonal do cubo", formula: "D = a√3", value: round(a * Math.sqrt(3)), unit: "u" },
      { label: "Diagonal da face", formula: "d = a√2", value: round(a * Math.SQRT2), unit: "u" },
    ],
    facts: [
      "Existem 11 planificações distintas do cubo.",
      "É o único poliedro de Platão que preenche o espaço sozinho.",
      "Seu dual é o octaedro regular.",
    ],
    net: ({ a }) => [
      rect(-a / 2, -a / 2, a, a),
      rect(a / 2, -a / 2, a, a),
      rect(-a * 1.5, -a / 2, a, a),
      rect(a * 1.5, -a / 2, a, a),
      rect(-a / 2, -a * 1.5, a, a),
      rect(-a / 2, a / 2, a, a),
    ],
    geometry: ({ a }) => ({ kind: "box", args: [a, a, a] }),
  },
  {
    id: "tetraedro",
    name: "Tetraedro",
    family: "Poliedros de Platão",
    tagline: "O menor poliedro possível: quatro triângulos equiláteros.",
    params: [P("a", "Aresta (a)", 2.6)],
    counts: () => ({ faces: 4, edges: 6, vertices: 4 }),
    measures: ({ a }) => [
      { label: "Altura", formula: "h = a√6/3", value: round((a * Math.sqrt(6)) / 3), unit: "u" },
      { label: "Área total", formula: "A_t = a²√3", value: round(a * a * Math.sqrt(3)), unit: "u²" },
      { label: "Volume", formula: "V = a³√2/12", value: round((a ** 3 * Math.SQRT2) / 12), unit: "u³" },
      {
        label: "Ângulo diedro",
        formula: "θ = arccos(1/3)",
        value: round((Math.acos(1 / 3) * 180) / Math.PI),
        unit: "°",
      },
    ],
    facts: [
      "É autodual: o dual de um tetraedro é outro tetraedro.",
      "Sua planificação é um triângulo grande dividido em quatro triângulos menores.",
      "Estrutura mais rígida possível — usada em treliças e moléculas como o metano.",
    ],
    net: ({ a }) => {
      const ht = (Math.sqrt(3) / 2) * a;
      const A: [number, number] = [-a, ht / 1.5];
      const B: [number, number] = [a, ht / 1.5];
      const C: [number, number] = [0, ht / 1.5 - 2 * ht];
      const mAB: [number, number] = [0, ht / 1.5];
      const mAC: [number, number] = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2];
      const mBC: [number, number] = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2];
      return [
        { type: "poly", points: [A, mAB, mAC] },
        { type: "poly", points: [mAB, B, mBC] },
        { type: "poly", points: [mAC, mBC, C] },
        { type: "poly", points: [mAB, mBC, mAC], label: "base" },
      ];
    },
    geometry: ({ a }) => ({ kind: "platonic", solid: "tetra", radius: (a * Math.sqrt(6)) / 4 }),
  },
  {
    id: "dodecaedro",
    name: "Dodecaedro",
    family: "Poliedros de Platão",
    tagline: "Doze pentágonos regulares — o sólido da razão áurea.",
    params: [P("a", "Aresta (a)", 1.2, 0.3, 3, 0.05)],
    counts: () => ({ faces: 12, edges: 30, vertices: 20 }),
    measures: ({ a }) => [
      {
        label: "Área total",
        formula: "A_t = 3a²√(25 + 10√5)",
        value: round(3 * a * a * Math.sqrt(25 + 10 * Math.sqrt(5))),
        unit: "u²",
      },
      {
        label: "Volume",
        formula: "V = a³(15 + 7√5)/4",
        value: round((a ** 3 * (15 + 7 * Math.sqrt(5))) / 4),
        unit: "u³",
      },
      {
        label: "Raio da esfera circunscrita",
        formula: "R = (a√3/4)(1 + √5)",
        value: round(((a * Math.sqrt(3)) / 4) * (1 + Math.sqrt(5))),
        unit: "u",
      },
    ],
    facts: [
      "Suas coordenadas envolvem φ = (1+√5)/2, o número de ouro.",
      "É o dual do icosaedro: trocando faces por vértices, um vira o outro.",
      "Platão o associava ao cosmos, o quinto elemento.",
    ],
    net: ({ a }) => {
      const R = circumradius(5, a);
      const m = apothem(5, a);
      const shapes: Net[] = [];
      const buildRing = (cy: number, flip: boolean) => {
        const rot = flip ? Math.PI / 2 : -Math.PI / 2;
        shapes.push({ type: "poly", points: ngon(5, R, 0, cy, rot) });
        for (let i = 0; i < 5; i++) {
          const ang = rot + Math.PI / 5 + (i * TAU) / 5;
          const d = 2 * m;
          shapes.push({
            type: "poly",
            points: ngon(5, R, d * Math.cos(ang), cy + d * Math.sin(ang), rot + Math.PI + (i * TAU) / 5),
          });
        }
      };
      const gap = (R + m) * 2.25;
      buildRing(-gap / 2, false);
      buildRing(gap / 2, true);
      return shapes;
    },
    geometry: ({ a }) => ({ kind: "platonic", solid: "dodeca", radius: ((a * Math.sqrt(3)) / 4) * (1 + Math.sqrt(5)) }),
  },
  {
    id: "icosaedro",
    name: "Icosaedro",
    family: "Poliedros de Platão",
    tagline: "Vinte triângulos equiláteros: o poliedro regular mais próximo da esfera.",
    params: [P("a", "Aresta (a)", 1.4, 0.3, 3, 0.05)],
    counts: () => ({ faces: 20, edges: 30, vertices: 12 }),
    measures: ({ a }) => [
      { label: "Área total", formula: "A_t = 5a²√3", value: round(5 * a * a * Math.sqrt(3)), unit: "u²" },
      {
        label: "Volume",
        formula: "V = (5/12)(3 + √5)a³",
        value: round((5 / 12) * (3 + Math.sqrt(5)) * a ** 3),
        unit: "u³",
      },
      {
        label: "Raio circunscrito",
        formula: "R = (a/4)√(10 + 2√5)",
        value: round((a / 4) * Math.sqrt(10 + 2 * Math.sqrt(5))),
        unit: "u",
      },
    ],
    facts: [
      "Em cada vértice encontram-se 5 triângulos — 12 vértices ao todo.",
      "É o dual do dodecaedro e base geométrica dos domos geodésicos.",
      "Muitos vírus, como o adenovírus, têm capsídeo icosaédrico.",
    ],
    net: ({ a }) => {
      const ht = (Math.sqrt(3) / 2) * a;
      const shapes: Net[] = [];
      const strip = (rowY: number, up: boolean, count: number, offset: number) => {
        for (let i = 0; i < count; i++) {
          const x0 = offset + i * (a / 2);
          if (up) {
            shapes.push({
              type: "poly",
              points: [
                [x0, rowY + ht],
                [x0 + a, rowY + ht],
                [x0 + a / 2, rowY],
              ],
            });
          } else {
            shapes.push({
              type: "poly",
              points: [
                [x0, rowY],
                [x0 + a, rowY],
                [x0 + a / 2, rowY + ht],
              ],
            });
          }
        }
      };
      const originX = -(5 * a) / 2;
      strip(-1.5 * ht, false, 5, originX + a / 2);
      strip(-0.5 * ht, false, 9, originX);
      strip(-0.5 * ht, true, 9, originX);
      strip(0.5 * ht, true, 5, originX);
      return shapes;
    },
    geometry: ({ a }) => ({ kind: "platonic", solid: "icosa", radius: (a / 4) * Math.sqrt(10 + 2 * Math.sqrt(5)) }),
  },
];

export const getSolid = (id: string) => SOLIDS.find((s) => s.id === id) ?? SOLIDS[0];
