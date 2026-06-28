import React from "react";
import { BarChart3, Building2, Coins, Landmark, LineChart, ShieldCheck } from "lucide-react";
import { MacroIndicator } from "../../types";

interface InvestmentDriversPanelProps {
  indicators: MacroIndicator[];
}

function macroValue(indicators: MacroIndicator[], id: string) {
  return indicators.find((indicator) => indicator.id === id)?.value ?? null;
}

function formatPercent(value: number | null) {
  return value === null ? "--" : `${value.toFixed(2)}%`;
}

export const InvestmentDriversPanel: React.FC<InvestmentDriversPanelProps> = ({ indicators }) => {
  const fed = macroValue(indicators, "FEDFUNDS");
  const inflation = macroValue(indicators, "CPI_YOY");
  const coreInflation = macroValue(indicators, "CORE_CPI_YOY");
  const tenYear = macroValue(indicators, "GS10");
  const curve = macroValue(indicators, "YIELD_CURVE_10Y2Y");
  const vix = macroValue(indicators, "VIXCLS");
  const dollar = macroValue(indicators, "DTWEXBGS");

  const drivers = [
    {
      icon: <LineChart size={18} />,
      title: "Acciones growth / IA / tecnologia",
      watch: ["Tipos Fed", "Bono 10Y", "beneficios esperados", "margen bruto", "valoracion"],
      reading: tenYear !== null && tenYear >= 4.5
        ? "Con 10Y alto, exige mas crecimiento real y menos narrativa."
        : "Si el 10Y baja, mejora el viento de cola para duracion y growth.",
      question: "La empresa crece lo bastante para justificar el multiple?",
    },
    {
      icon: <Building2 size={18} />,
      title: "Acciones calidad / dividendos",
      watch: ["deuda neta", "flujo de caja libre", "margen operativo", "payout", "pricing power"],
      reading: inflation !== null && inflation >= 4
        ? "Inflacion alta favorece negocios con poder de precios y castiga margenes fragiles."
        : "Con inflacion moderada, pesa mas la ejecucion propia del negocio.",
      question: "Puede mantener margenes si suben costes o baja demanda?",
    },
    {
      icon: <Landmark size={18} />,
      title: "Bonos, monetarios y liquidez",
      watch: ["tipo Fed", "curva 10Y-2Y", "duracion", "calidad crediticia", "inflacion real"],
      reading: curve !== null && curve < 0
        ? "Curva invertida: la liquidez y bonos cortos pueden competir muy bien."
        : "Curva normalizada: revisar duracion y sensibilidad a tipos.",
      question: "Estoy cobrando suficiente rentabilidad por el riesgo y la duracion?",
    },
    {
      icon: <BarChart3 size={18} />,
      title: "ETFs globales e indexados",
      watch: ["valoracion agregada", "peso USA", "divisa", "costes", "diversificacion sectorial"],
      reading: dollar !== null && dollar >= 120
        ? "Dolar fuerte puede alterar rentabilidad en euros y presionar emergentes."
        : "La clave sigue siendo horizonte largo, costes bajos y aportacion periodica.",
      question: "El ETF diversifica de verdad o concentra demasiado en pocos gigantes?",
    },
    {
      icon: <Coins size={18} />,
      title: "Materias primas / oro / emergentes",
      watch: ["dolar", "tipos reales", "inflacion", "riesgo geopolitico", "ciclo industrial"],
      reading: dollar !== null && dollar >= 120
        ? "Dolar fuerte suele ser viento en contra para emergentes y materias primas."
        : "Si el dolar se debilita, estos activos pueden ganar traccion relativa.",
      question: "Es cobertura, ciclo tactico o apuesta especulativa?",
    },
    {
      icon: <ShieldCheck size={18} />,
      title: "Oportunidades asimetricas",
      watch: ["balance", "caja", "deuda", "catalizador", "liquidez", "probabilidad de supervivencia"],
      reading: vix !== null && vix >= 25
        ? "Volatilidad alta crea precios raros, pero exige tamano pequeno y paciencia."
        : "Con mercado tranquilo, la asimetria debe venir mas de fundamentales que de panico.",
      question: "Que tiene que pasar para que la tesis sea falsa?",
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Mapa educativo de variables clave</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Que mirar antes de estudiar cada tipo de activo. No da ordenes: ayuda a hacer mejores preguntas.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <span className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-300">Fed {formatPercent(fed)}</span>
          <span className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-300">IPC {formatPercent(inflation)}</span>
          <span className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-300">Suby. {formatPercent(coreInflation)}</span>
          <span className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-300">VIX {vix === null ? "--" : vix.toFixed(1)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {drivers.map((driver) => (
          <article key={driver.title} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-start gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
                {driver.icon}
              </div>
              <div>
                <h3 className="font-bold text-slate-100">{driver.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{driver.reading}</p>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {driver.watch.map((item) => (
                <span key={item} className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {item}
                </span>
              ))}
            </div>
            <p className="border-t border-slate-800 pt-3 text-sm font-semibold text-slate-200">
              {driver.question}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};
