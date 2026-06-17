import React from "react";
import { MacroIndicator } from "../../types";
import { AlertTriangle, CheckCircle2, Gauge, MinusCircle, TrendingDown, TrendingUp } from "lucide-react";

interface MacroTrafficLightProps {
  indicators: MacroIndicator[];
}

type SignalState = "positive" | "neutral" | "caution";

interface MacroSignal {
  id: string;
  title: string;
  value: string;
  state: SignalState;
  reading: string;
  impact: string;
}

function formatValue(indicator?: MacroIndicator) {
  if (!indicator || indicator.value === null) return "--";
  return `${indicator.value.toFixed(2)} ${indicator.unit}`;
}

function findIndicator(indicators: MacroIndicator[], id: string) {
  return indicators.find((indicator) => indicator.id === id);
}

function stateClasses(state: SignalState) {
  if (state === "positive") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (state === "caution") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-slate-600/50 bg-slate-800/60 text-slate-300";
}

function StateIcon({ state }: { state: SignalState }) {
  if (state === "positive") return <CheckCircle2 className="w-5 h-5" />;
  if (state === "caution") return <AlertTriangle className="w-5 h-5" />;
  return <MinusCircle className="w-5 h-5" />;
}

function buildSignals(indicators: MacroIndicator[]): MacroSignal[] {
  const fed = findIndicator(indicators, "FEDFUNDS");
  const cpi = findIndicator(indicators, "CPIAUCSL");
  const unemployment = findIndicator(indicators, "UNRATE");
  const us10y = findIndicator(indicators, "GS10");
  const ecb = findIndicator(indicators, "ECB_RATE");

  const fedValue = fed?.value ?? null;
  const cpiValue = cpi?.value ?? null;
  const unemploymentValue = unemployment?.value ?? null;
  const us10yValue = us10y?.value ?? null;
  const ecbValue = ecb?.value ?? null;

  return [
    {
      id: "rates",
      title: "Tipos y liquidez",
      value: `Fed ${formatValue(fed)} · BCE ${formatValue(ecb)}`,
      state: fedValue !== null && fedValue >= 5 ? "caution" : fedValue !== null && fedValue <= 3 ? "positive" : "neutral",
      reading: fedValue !== null && fedValue >= 5 ? "Entorno todavía restrictivo" : "Entorno menos exigente",
      impact: "Tipos altos presionan valoraciones growth y hacen más atractiva la renta fija nueva.",
    },
    {
      id: "inflation",
      title: "Inflación",
      value: formatValue(cpi),
      state: cpiValue !== null && cpiValue > 20 ? "neutral" : cpiValue !== null && cpiValue > 4 ? "caution" : "neutral",
      reading: cpiValue !== null && cpiValue > 20 ? "Dato mostrado como índice CPI" : "Dato para vigilar tendencia",
      impact: "Lo útil no es solo el nivel: importa si la inflación acelera o se enfría.",
    },
    {
      id: "growth",
      title: "Ciclo económico",
      value: `Paro EE. UU. ${formatValue(unemployment)}`,
      state: unemploymentValue !== null && unemploymentValue > 5 ? "caution" : unemploymentValue !== null && unemploymentValue < 3.5 ? "caution" : "neutral",
      reading: unemploymentValue !== null && unemploymentValue > 5 ? "Riesgo de desaceleración" : "Mercado laboral sin alarma clara",
      impact: "Deterioro laboral suele aumentar riesgo de recesión; paro muy bajo puede mantener presión salarial.",
    },
    {
      id: "bonds",
      title: "Bono 10 años",
      value: formatValue(us10y),
      state: us10yValue !== null && us10yValue >= 4.5 ? "caution" : us10yValue !== null && us10yValue <= 3.2 ? "positive" : "neutral",
      reading: us10yValue !== null && us10yValue >= 4.5 ? "Rentabilidad exigente para bolsa" : "Presión de tipos moderada",
      impact: "Si el bono sube, las acciones caras sufren más; si baja, mejora el viento de cola para duración y growth.",
    },
  ];
}

export const MacroTrafficLight: React.FC<MacroTrafficLightProps> = ({ indicators }) => {
  const signals = buildSignals(indicators);
  const cautionCount = signals.filter((signal) => signal.state === "caution").length;
  const positiveCount = signals.filter((signal) => signal.state === "positive").length;

  const overallState: SignalState = cautionCount >= 2 ? "caution" : positiveCount >= 2 ? "positive" : "neutral";
  const overallLabel = overallState === "caution"
    ? "Cautela macro"
    : overallState === "positive"
      ? "Viento de cola"
      : "Entorno mixto";
  const overallText = overallState === "caution"
    ? "El entorno no impide invertir, pero pide más margen de seguridad y menos euforia."
    : overallState === "positive"
      ? "El entorno parece más favorable para asumir riesgo, siempre con control de valoración."
      : "Hay señales cruzadas: conviene estudiar activo por activo y evitar conclusiones rápidas.";

  return (
    <section className="bg-slate-900 border border-purple-500/20 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Gauge className="text-purple-400" />
            Semáforo macro
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Traduce los datos macro a una lectura educativa para interpretar el radar.
          </p>
        </div>
        <div className={`rounded-xl border px-4 py-3 ${stateClasses(overallState)}`}>
          <div className="flex items-center gap-2 font-bold">
            <StateIcon state={overallState} />
            {overallLabel}
          </div>
          <p className="text-xs opacity-90 mt-1 max-w-md">{overallText}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {signals.map((signal) => (
          <article key={signal.id} className={`rounded-xl border p-4 ${stateClasses(signal.state)}`}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-bold text-sm">{signal.title}</h3>
              <StateIcon state={signal.state} />
            </div>
            <p className="text-lg font-extrabold text-white">{signal.value}</p>
            <p className="text-xs font-bold mt-2">{signal.reading}</p>
            <p className="text-xs opacity-85 mt-2 leading-relaxed">{signal.impact}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-400 mt-0.5" />
          <p className="text-slate-300">Lectura favorable: más margen para estudiar bolsa y activos de crecimiento, sin olvidar valoración.</p>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
          <TrendingDown className="w-5 h-5 text-amber-400 mt-0.5" />
          <p className="text-slate-300">Lectura de cautela: priorizar calidad, diversificación y aportaciones graduales frente a decisiones impulsivas.</p>
        </div>
      </div>
    </section>
  );
};

