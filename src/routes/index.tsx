import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Box, Grid2x2, Info, RotateCw, Ruler, Scan } from "lucide-react";
import { SOLIDS, type Params, type SolidDef } from "@/data/solids";
import SolidNet from "@/components/SolidNet";
import { cn } from "@/lib/utils";

const SolidScene = lazy(() => import("@/components/SolidScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sólidos Geométricos 3D — Visualize, planifique e calcule" },
      {
        name: "description",
        content:
          "Explore cone, cilindro, prismas, pirâmides, cubo, tetraedro, dodecaedro e icosaedro em 3D, com planificação, fórmulas e medidas interativas.",
      },
      { property: "og:title", content: "Sólidos Geométricos 3D — Visualize, planifique e calcule" },
      {
        property: "og:description",
        content:
          "Visualização 3D interativa, planificações, medidas e informações de 11 sólidos geométricos.",
      },
    ],
  }),
  component: Index,
});

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function defaults(solid: SolidDef): Params {
  return Object.fromEntries(solid.params.map((p) => [p.key, p.default])) as Params;
}

function Index() {
  const [solidId, setSolidId] = useState(SOLIDS[0]!.id);
  const solid = useMemo(() => SOLIDS.find((s) => s.id === solidId)!, [solidId]);
  const [params, setParams] = useState<Params>(() => defaults(SOLIDS[0]!));
  const [tab, setTab] = useState<"3d" | "net">("3d");
  const [spin, setSpin] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const mounted = useMounted();

  function select(s: SolidDef) {
    setSolidId(s.id);
    setParams(defaults(s));
  }

  const counts = solid.counts(params);
  const measures = solid.measures(params);
  const families = [...new Set(SOLIDS.map((s) => s.family))];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-4">
          <div className="flex size-10 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary">
            <Box className="size-5" />
          </div>
          <div className="mr-auto">
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              Atlas de Sólidos Geométricos
            </h1>
            <p className="tick mt-0.5">visualização 3D · planificação · medidas</p>
          </div>
          <p className="hidden max-w-xs text-xs text-muted-foreground md:block">
            Arraste para girar, use a roda do mouse para aproximar e ajuste as medidas para ver
            fórmulas recalculadas em tempo real.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Lista de sólidos" className="panel h-fit p-3 lg:sticky lg:top-5">
          {families.map((f) => (
            <div key={f} className="mb-3 last:mb-0">
              <p className="tick px-2 pb-1.5">{f}</p>
              <ul className="space-y-0.5">
                {SOLIDS.filter((s) => s.family === f).map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => select(s)}
                      className={cn(
                        "w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                        s.id === solidId
                          ? "bg-primary/15 font-medium text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                      aria-current={s.id === solidId ? "true" : undefined}
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2">
              <h2 className="mr-auto pl-1 text-base font-semibold">{solid.name}</h2>
              <div className="flex rounded-md border border-border p-0.5">
                {(
                  [
                    ["3d", "3D", Scan],
                    ["net", "Planificação", Grid2x2],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors",
                      tab === key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              {tab === "3d" && (
                <>
                  <button
                    onClick={() => setSpin((v) => !v)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors",
                      spin ? "text-accent" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <RotateCw className="size-3.5" /> Girar
                  </button>
                  <button
                    onClick={() => setWireframe((v) => !v)}
                    className={cn(
                      "rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors",
                      wireframe ? "text-accent" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Ver arestas
                  </button>
                </>
              )}
            </div>

            <div className="h-[420px] bg-[#0b1220] sm:h-[520px]">
              {tab === "3d" ? (
                mounted ? (
                  <Suspense fallback={<Placeholder />}>
                    <SolidScene solid={solid} params={params} wireframe={wireframe} spin={spin} />
                  </Suspense>
                ) : (
                  <Placeholder />
                )
              ) : (
                <div className="h-full p-6">
                  <SolidNet solid={solid} params={params} />
                </div>
              )}
            </div>

            <p className="border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
              {solid.tagline}
            </p>
          </section>

          <div className="space-y-5">
            <section className="panel p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Ruler className="size-4 text-primary" /> Medidas
              </h3>
              <div className="space-y-3">
                {solid.params.map((p) => (
                  <div key={p.key}>
                    <div className="flex items-baseline justify-between">
                      <label htmlFor={p.key} className="text-xs text-muted-foreground">
                        {p.label}
                      </label>
                      <span className="font-mono text-sm text-accent">
                        {params[p.key]?.toFixed(2)}
                      </span>
                    </div>
                    <input
                      id={p.key}
                      type="range"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={params[p.key]}
                      onChange={(e) =>
                        setParams((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))
                      }
                      className="mt-1 w-full accent-[var(--primary)]"
                    />
                  </div>
                ))}
              </div>

              <dl className="mt-4 space-y-2 border-t border-border/70 pt-3">
                {measures.map((m) => (
                  <div key={m.label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs">
                      <span className="block text-foreground">{m.label}</span>
                      <span className="font-mono text-[0.68rem] text-muted-foreground">
                        {m.formula}
                      </span>
                    </dt>
                    <dd className="shrink-0 font-mono text-sm text-accent">
                      {m.value} <span className="text-[0.65rem] text-muted-foreground">{m.unit}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="panel p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Info className="size-4 text-primary" /> Informações
              </h3>
              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Faces", counts.faces],
                  ["Arestas", counts.edges],
                  ["Vértices", counts.vertices],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-md bg-secondary/60 py-2">
                    <p className="font-mono text-lg text-primary">{value}</p>
                    <p className="tick">{label}</p>
                  </div>
                ))}
              </div>
              <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                {solid.facts.map((f) => (
                  <li key={f} className="border-l-2 border-accent/50 pl-2.5">
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-5 pb-8 pt-2 text-xs text-muted-foreground">
        Medidas em unidades genéricas (u). Relação de Euler para poliedros convexos: F + V − A = 2.
      </footer>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="tick animate-pulse">carregando cena 3D…</p>
    </div>
  );
}
