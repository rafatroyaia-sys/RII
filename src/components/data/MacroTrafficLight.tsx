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
  const cpi = findIndicator(indicators, "CPI_YOY");
  const coreCpi = findIndicator(indicators, "CORE_CPI_YOY");
  const unemployment = findIndicator(indicators, "UNRATE");
  const us10y = findIndicator(indicators, "GS10");
  const curve = findIndicator(indicators, "YIELD_CURVE_10Y2Y");
  const vix = findIndicator(indicators, "VIXCLS");
  const dollar = findIndicator(indicators, "DTWEXBGS");

  const fedValue = fed?.value ?? null;
  const cpiValue = cpi?.value ?? null;
  const coreCpiValue = coreCpi?.value ?? null;
  const unemploymentValue = unemployment?.value ?? null;
  const us10yValue = us10y?.value ?? null;
  const curveValue = curve?.value ?? null;
  const vixValue = vix?.value ?? null;
  const dollarValue = dollar?.value ?? null;

  return [
    {
      id: "rates",
      title: "Tipos y liquidez",
      value: `Fed ${formatValue(fed)} · 10Y ${formatValue(us10y)}`,
      state: fedValue !== null && fedValue >= 5 ? "caution" : fedValue !== null && fedValue <= 3 ? "positive" : "neutral",
      reading: fedValue !== null && fedValue >= 5 ? "Entorno restrictivo" : "Liquidez menos exigente",
      impact: "Tipos altos reducen valoraciones growth, elevan la rentabilidad exigida y hacen mas competitiva la renta fija.",
    },
    {
      id: "inflation",
      title: "Inflacion",
      value: `IPC ${formatValue(cpi)} · Suby. ${formatValue(coreCpi)}`,
      state: (cpiValue !== null && cpiValue > 4) || (coreCpiValue !== null && coreCpiValue > 4) ? "caution" : cpiValue !== null && cpiValue < 2.5 ? "positive" : "neutral",
      reading: coreCpiValue !== null && coreCpiValue > 4 ? "Presion subyacente alta" : "Vigilar tendencia",
      impact: "Inflacion persistente retrasa bajadas de tipos; beneficia pricing power y castiga duracion si repunta.",
    },
    {
      id: "cycle",
      title: "Ciclo economico",
      value: `Paro ${formatValue(unemployment)} · Curva ${formatValue(curve)}`,
      state: unemploymentValue !== null && unemploymentValue > 5 ? "caution" : curveValue !== null && curveValue < -0.5 ? "caution" : "neutral",
      reading: curveValue !== null && curveValue < -0.5 ? "Curva invertida" : "Sin alarma clara de ciclo",
      impact: "Curva invertida y paro al alza suelen anticipar desaceleracion; mirar calidad de beneficios y deuda.",
    },
    {
      id: "risk",
      title: "Apetito por riesgo",
      value: `VIX ${formatValue(vix)} · Dolar ${formatValue(dollar)}`,
      state: vixValue !== null && vixValue >= 25 ? "caution" : vixValue !== null && vixValue <= 15 ? "positive" : "neutral",
      reading: vixValue !== null && vixValue >= 25 ? "Mercado nervioso" : "Volatilidad manejable",
      impact: "VIX alto exige entradas graduales; dolar fuerte puede presionar emergentes, materias primas y resultados internacionales.",
    },
    {
      id: "bonds",
      title: "Duracion y bonos",
      value: formatValue(us10y),
      state: us10yValue !== null && us10yValue >= 4.5 ? "caution" : us10yValue !== null && us10yValue <= 3.2 ? "positive" : "neutral",
      reading: us10yValue !== null && us10yValue >= 4.5 ? "Rentabilidad exigente para bolsa" : "Presion de tipos moderada",
      impact: "Si el 10Y sube, sufren activos caros y bonos largos; si baja, mejora viento de cola para duracion y growth.",
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
    ? "El entorno no impide invertir, pero pide mas margen de seguridad, diversificacion y menos euforia."
    : overallState === "positive"
      ? "El entorno parece mas favorable para asumir riesgo, siempre con control de valoracion."
      : "Hay senales cruzadas: conviene estudiar activo por activo y evitar conclusiones rapidas.";

  return (
    <section className="bg-slate-900 border border-purple-500/20 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Gauge className="text-purple-400" />
            Semaforo macro
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Traduce tipos, inflacion, ciclo, curva, volatilidad y dolar a una lectura educativa para el radar.
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {signals.map((signal) => (
          <article key={signal.id} className={`rounded-xl border p-4 ${stateClasses(signal.state)}`}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-bold text-sm">{signal.title}</h3>
              <StateIcon state={signal.state} />
            </div>
            <p className="text-base font-extrabold text-white leading-snug">{signal.value}</p>
            <p className="text-xs font-bold mt-2">{signal.reading}</p>
            <p className="text-xs opacity-85 mt-2 leading-relaxed">{signal.impact}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-400 mt-0.5" />
          <p className="text-slate-300">Lectura favorable: mas margen para estudiar bolsa y activos de crecimiento, sin olvidar valoracion.</p>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
          <TrendingDown className="w-5 h-5 text-amber-400 mt-0.5" />
          <p className="text-slate-300">Lectura de cautela: priorizar calidad, liquidez, diversificacion y aportaciones graduales.</p>
        </div>
      </div>
    </section>
  );
};
