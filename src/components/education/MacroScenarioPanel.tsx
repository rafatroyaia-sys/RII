import React from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Gauge, ShieldCheck } from "lucide-react";
import { MacroIndicator } from "../../types";

interface MacroScenarioPanelProps {
  indicators: MacroIndicator[];
}

type ScenarioTone = "green" | "amber" | "slate";

function macroValue(indicators: MacroIndicator[], id: string) {
  return indicators.find((indicator) => indicator.id === id)?.value ?? null;
}

function toneClasses(tone: ScenarioTone, active: boolean) {
  if (tone === "green") {
    return active
      ? "border-emerald-500/40 bg-emerald-500/10"
      : "border-slate-800 bg-slate-950/40";
  }
  if (tone === "amber") {
    return active
      ? "border-amber-500/40 bg-amber-500/10"
      : "border-slate-800 bg-slate-950/40";
  }
  return active
    ? "border-sky-500/35 bg-sky-500/10"
    : "border-slate-800 bg-slate-950/40";
}

export const MacroScenarioPanel: React.FC<MacroScenarioPanelProps> = ({ indicators }) => {
  const fed = macroValue(indicators, "FEDFUNDS");
  const inflation = macroValue(indicators, "CPI_YOY");
  const coreInflation = macroValue(indicators, "CORE_CPI_YOY");
  const tenYear = macroValue(indicators, "GS10");
  const curve = macroValue(indicators, "YIELD_CURVE_10Y2Y");
  const vix = macroValue(indicators, "VIXCLS");
  const dollar = macroValue(indicators, "DTWEXBGS");

  const scenarios = [
    {
      title: "Bajadas de tipos / liquidez mejorando",
      active: fed !== null && fed < 4.25 && tenYear !== null && tenYear < 4,
      tone: "green" as const,
      signal: `Fed ${fed === null ? "--" : `${fed.toFixed(2)}%`} · 10Y ${tenYear === null ? "--" : `${tenYear.toFixed(2)}%`}`,
      favours: ["growth de calidad", "tecnologia/IA", "bonos largos", "ETFs globales"],
      hurts: ["monetarios si baja la remuneracion", "empresas caras sin crecimiento real"],
      action: "Estudiar crecimiento, pero exigir beneficios y valoracion razonable.",
    },
    {
      title: "Inflacion persistente o repuntando",
      active: (inflation !== null && inflation >= 4) || (coreInflation !== null && coreInflation >= 4),
      tone: "amber" as const,
      signal: `IPC ${inflation === null ? "--" : `${inflation.toFixed(2)}%`} · Suby. ${coreInflation === null ? "--" : `${coreInflation.toFixed(2)}%`}`,
      favours: ["negocios con poder de precios", "energia/materiales si acompana ciclo", "liquidez remunerada"],
      hurts: ["growth caro", "bonos largos", "empresas sin margen"],
      action: "Priorizar calidad, margenes y deuda baja; evitar pagar cualquier precio.",
    },
    {
      title: "Riesgo de desaceleracion",
      active: curve !== null && curve < -0.5,
      tone: "amber" as const,
      signal: `Curva 10Y-2Y ${curve === null ? "--" : `${curve.toFixed(2)} p.p.`}`,
      favours: ["calidad defensiva", "bonos cortos", "empresas con caja"],
      hurts: ["ciclicas endeudadas", "small caps fragiles", "asimetria sin caja"],
      action: "Revisar balance, liquidez y sensibilidad al ciclo antes de perseguir caidas.",
    },
    {
      title: "Mercado nervioso / VIX alto",
      active: vix !== null && vix >= 25,
      tone: "amber" as const,
      signal: `VIX ${vix === null ? "--" : vix.toFixed(1)}`,
      favours: ["compras por tramos", "activos de calidad castigados", "coberturas prudentes"],
      hurts: ["apalancamiento", "operar por impulso", "posiciones concentradas"],
      action: "Dividir entradas, reducir tamano y escribir la tesis antes de actuar.",
    },
    {
      title: "Dolar fuerte",
      active: dollar !== null && dollar >= 120,
      tone: "slate" as const,
      signal: `Dolar ${dollar === null ? "--" : dollar.toFixed(1)}`,
      favours: ["empresas USA con costes locales", "liquidez en USD", "importadores no USA si baja despues"],
      hurts: ["emergentes", "materias primas", "empresas con deuda en USD"],
      action: "Mirar divisa real del activo y no confundir rentabilidad del negocio con efecto moneda.",
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Gauge size={20} className="text-sky-300" />
            Escenarios de mercado
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Traduce los datos macro a posibilidades. No predice; ayuda a preparar preguntas antes de invertir.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300">
          <ShieldCheck size={14} />
          Lectura educativa
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {scenarios.map((scenario) => (
          <article key={scenario.title} className={`rounded-xl border p-4 ${toneClasses(scenario.tone, scenario.active)}`}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100">{scenario.title}</h3>
                <p className="mt-1 text-[11px] font-mono text-slate-500">{scenario.signal}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                scenario.active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
              }`}>
                {scenario.active ? "Activo" : "Vigilar"}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="mb-1 flex items-center gap-1 font-bold uppercase tracking-wide text-emerald-300">
                  <ArrowUp size={12} /> Favorece
                </div>
                <p className="leading-relaxed text-slate-300">{scenario.favours.join(", ")}</p>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-1 font-bold uppercase tracking-wide text-rose-300">
                  <ArrowDown size={12} /> Perjudica
                </div>
                <p className="leading-relaxed text-slate-300">{scenario.hurts.join(", ")}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div className="mb-1 flex items-center gap-1 font-bold text-amber-300">
                  <AlertTriangle size={12} /> Prudencia
                </div>
                <p className="leading-relaxed text-slate-300">{scenario.action}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
