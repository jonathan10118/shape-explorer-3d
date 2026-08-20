import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { SolidNet } from "@/components/SolidNet";
import { SolidScene } from "@/components/SolidScene";
import { SOLIDS, defaultsFor, type Rec } from "@/data/solids";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sólidos Geométricos 3D — Planificação, Medidas e Fórmulas" },
      {
        name: "description",
        content:
          "Explore 11 sólidos geométricos em 3D interativo: cone, cilindro, prismas, pirâmides, cubo, tetraedro, dodecaedro e icosaedro com planificação, medidas e fórmulas.",
      },
      { property: "og:title", content: "Sólidos Geométricos 3D — Planificação e Medidas" },
      {
        property: "og:description",
        content:
          "Visualização 3D, planificação correta, fórmulas de área e volume de 11 sólidos geométricos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [id, setId] = useState(SOLIDS[0]!.id);
  const [tab, setTab] = useState<"3d" | "net">("3d");
  const [wire, setWire] = useState(false);
  const [params, setParams] = useState<Record<string, Rec>>(() =>
    Object.fromEntries(SOLIDS.map((s) => [s.id, defaultsFor(s)])),
  );

  const solid = useMemo(() => SOLIDS.find((s) => s.id === id)!, [id]);
  const p = params[id]!;
  const counts = solid.counts(p);
  const measures = solid.measures(p);
  const net = useMemo(() => solid.net(p), [solid, p]);

  const families = Array.from(new Set(SOLIDS.map((s) => s.family)));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 px-5 py-5">
        <p className="font-mono text-xs tracking-[0.3em] text-primary uppercase">
          Geometria espacial
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Atlas dos Sólidos Geométricos
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Visualização 3D interativa, planificação, medidas e informações de 11 sólidos.
        </p>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 p-5 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-4">
          {families.map((f) => (
            <div key={f}>
              <p className="mb-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                {f}
              </p>
              <div className="flex flex-wrap gap-1.5 lg:flex-col">
                {SOLIDS.filter((s) => s.family === f).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setId(s.id)}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      s.id === id
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <main className="space-y-5">
          <section className="rounded-xl border border-border/60 bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{solid.name}</h2>
                <p className="text-sm text-muted-foreground">{solid.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border/60 p-0.5">
                  {(
                    [
                      ["3d", "3D"],
                      ["net", "Planificação"],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setTab(k)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                        tab === k
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {tab === "3d" && (
                  <button
                    onClick={() => setWire((w) => !w)}
                    className="rounded-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {wire ? "Sólido" : "Arestas"}
                  </button>
                )}
              </div>
            </div>

            <div className="h-[340px] overflow-hidden rounded-lg border border-border/60 bg-[#070d1b] sm:h-[440px]">
              {tab === "3d" ? (
                <SolidScene geometry={solid.geometry(p)} wire={wire} />
              ) : (
                <div className="h-full w-full p-4">
                  <SolidNet shapes={net} />
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {tab === "3d"
                ? "Arraste para girar · role para dar zoom."
                : "Planificação em escala: dobre pelas arestas em comum para montar o sólido."}
            </p>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="mb-3 font-mono text-xs tracking-widest text-primary uppercase">
                Medidas
              </h3>
              <div className="space-y-4">
                {solid.params.map((pd) => (
                  <label key={pd.key} className="block">
                    <span className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{pd.label}</span>
                      <span className="font-mono text-foreground">
                        {p[pd.key as keyof Rec].toFixed(1)} cm
                      </span>
                    </span>
                    <input
                      type="range"
                      min={pd.min}
                      max={pd.max}
                      step={pd.step}
                      value={p[pd.key as keyof Rec]}
                      onChange={(e) =>
                        setParams((prev) => ({
                          ...prev,
                          [id]: { ...prev[id]!, [pd.key]: Number(e.target.value) },
                        }))
                      }
                      className="mt-2 w-full accent-[var(--net-stroke)]"
                    />
                  </label>
                ))}
              </div>

              <table className="mt-5 w-full text-sm">
                <tbody>
                  {measures.map((m) => (
                    <tr key={m.label} className="border-t border-border/50">
                      <td className="py-2 pr-2">
                        <div>{m.label}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {m.formula}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono whitespace-nowrap text-primary">
                        {m.value} {m.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="mb-3 font-mono text-xs tracking-widest text-primary uppercase">
                Informações
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Faces", counts.F],
                  ["Arestas", counts.E],
                  ["Vértices", counts.V],
                ].map(([label, v]) => (
                  <div key={label} className="rounded-lg border border-border/60 py-3">
                    <div className="font-mono text-2xl text-primary">{v}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
              {counts.V > 0 && (
                <p className="mt-3 font-mono text-xs text-muted-foreground">
                  Relação de Euler: F + V − A = {counts.F} + {counts.V} − {counts.E} ={" "}
                  {counts.F + counts.V - counts.E}
                </p>
              )}
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {solid.facts.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-primary">▸</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
