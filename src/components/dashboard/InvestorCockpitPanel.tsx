import React, { useMemo } from "react";
import { AlertTriangle, ArrowRight, BarChart3, Compass, Gauge, Radar, ShieldCheck, UserCheck } from "lucide-react";
import { MacroIndicator, ProcessedAsset } from "../../types";
import { OpportunityCandidate } from "../../logic/opportunityRadar";

interface InvestorCockpitPanelProps {
  userProfile: { score: number; name: string } | null;
  macroIndicators: MacroIndicator[];
  opportunityCandidates: OpportunityCandidate[];
  assets: ProcessedAsset[];
  onGoProfile: () => void;
  onGoMacro: () => void;
  onGoRadar: () => void;
  onGoPortfolio: () => void;
  onSelectAsset: (asset: ProcessedAsset) => void;
}

function macroValue(indicators: MacroIndicator[], id: string) {
  return indicators.find((indicator) => indicator.id === id)?.value ?? null;
}

function formatMacro(value: number | null, suffix = "%") {
  return value === null ? "--" : `${value.toFixed(1)}${suffix}`;
}

function buildMacroReading(indicators: MacroIndicator[]) {
  const fed = macroValue(indicators, "FEDFUNDS");
  const inflation = macroValue(indicators, "CPI_YOY");
  const curve = macroValue(indicators, "YIELD_CURVE_10Y2Y");
  const vix = macroValue(indicators, "VIXCLS");

  if (vix !== null && vix >= 25) {
    return {
      label: "Mercado nervioso",
      tone: "text-amber-300 border-amber-500/20 bg-amber-500/5",
      text: `VIX en ${formatMacro(vix, "")}: conviene reducir impulsos y exigir más margen de seguridad.`,
    };
  }

  if (curve !== null && curve < 0) {
    return {
      label: "Curva invertida",
      tone: "text-sky-300 border-sky-500/20 bg-sky-500/5",
      text: `Curva 10Y-2Y en ${formatMacro(curve)}: el mercado sigue vigilando desaceleración.`,
    };
  }

  if (fed !== null && inflation !== null && fed > inflation) {
    return {
      label: "Tipos restrictivos",
      tone: "text-slate-200 border-slate-700 bg-slate-950/50",
      text: `Fed ${formatMacro(fed)} frente a inflación ${formatMacro(inflation)}: el precio del dinero sigue importando.`,
    };
  }

  return {
    label: "Contexto mixto",
    tone: "text-emerald-300 border-emerald-500/20 bg-emerald-500/5",
    text: "Lee tipos, inflación, curva y volatilidad antes de sacar conclusiones sobre activos concretos.",
  };
}

function findMainRisk(assets: ProcessedAsset[]) {
  const highRisk = assets
    .filter((asset) => asset.scores.risk >= 75)
    .sort((a, b) => b.scores.risk - a.scores.risk)[0];

  if (highRisk) {
    return {
      title: `${highRisk.ticker}: riesgo alto`,
      text: `${highRisk.name} exige especial cuidado: riesgo ${highRisk.scores.risk}/100 y lectura adecuada solo si se entiende la tesis.`,
    };
  }

  return {
    title: "Riesgo principal: concentración",
    text: "Aunque una idea parezca buena, el error típico es concentrar demasiado en una sola narrativa, sector o divisa.",
  };
}

export const InvestorCockpitPanel: React.FC<InvestorCockpitPanelProps> = ({
  userProfile,
  macroIndicators,
  opportunityCandidates,
  assets,
  onGoProfile,
  onGoMacro,
  onGoRadar,
  onGoPortfolio,
  onSelectAsset,
}) => {
  const macroReading = useMemo(() => buildMacroReading(macroIndicators), [macroIndicators]);
  const mainCandidate = opportunityCandidates[0] ?? null;
  const mainRisk = useMemo(() => findMainRisk(assets), [assets]);

  const action = userProfile
    ? "Revisar radar con tu perfil activo"
    : "Completar perfil antes de comparar ideas";

  return (
    <section className="rounded-2xl border border-emerald-500/20 bg-slate-900/90 p-5 sm:p-6 shadow-[0_0_40px_-20px_rgba(16,185,129,0.35)]">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Compass size={20} className="text-emerald-300" />
            Cockpit del inversor
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
            Una lectura rápida para saber por dónde empezar hoy: perfil, contexto macro, idea a estudiar y riesgo a vigilar.
          </p>
        </div>
        <button
          onClick={userProfile ? onGoRadar : onGoProfile}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400"
        >
          {action}
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-emerald-300">
            <UserCheck size={18} />
            <h3 className="font-bold text-slate-100">Perfil</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            {userProfile
              ? `${userProfile.name}: usa este perfil como filtro antes de mirar rentabilidad.`
              : "Pendiente: sin perfil, la app no puede contextualizar bien el riesgo."}
          </p>
          <button onClick={onGoProfile} className="mt-4 text-xs font-bold text-emerald-300 hover:text-emerald-200">
            Ir a perfil
          </button>
        </article>

        <article className={`rounded-xl border p-4 ${macroReading.tone}`}>
          <div className="mb-3 flex items-center gap-2">
            <Gauge size={18} />
            <h3 className="font-bold">Macro</h3>
          </div>
          <p className="text-xs font-black uppercase tracking-widest opacity-70">{macroReading.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{macroReading.text}</p>
          <button onClick={onGoMacro} className="mt-4 text-xs font-bold text-emerald-300 hover:text-emerald-200">
            Ver contexto macro
          </button>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sky-300">
            <Radar size={18} />
            <h3 className="font-bold text-slate-100">Idea a estudiar</h3>
          </div>
          {mainCandidate ? (
            <>
              <p className="text-sm font-bold text-white">{mainCandidate.asset.ticker} · {mainCandidate.asset.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{mainCandidate.setup}. {mainCandidate.catalyst}</p>
              <button onClick={() => onSelectAsset(mainCandidate.asset)} className="mt-4 text-xs font-bold text-emerald-300 hover:text-emerald-200">
                Abrir ficha
              </button>
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-slate-300">Aún no hay suficientes candidatos ordenados.</p>
              <button onClick={onGoRadar} className="mt-4 text-xs font-bold text-emerald-300 hover:text-emerald-200">
                Abrir radar
              </button>
            </>
          )}
        </article>

        <article className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-amber-300">
            <AlertTriangle size={18} />
            <h3 className="font-bold">Riesgo a vigilar</h3>
          </div>
          <p className="text-sm font-bold text-white">{mainRisk.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{mainRisk.text}</p>
          <button onClick={onGoPortfolio} className="mt-4 text-xs font-bold text-emerald-300 hover:text-emerald-200">
            Revisar cartera
          </button>
        </article>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-100">
            <ShieldCheck size={16} className="text-emerald-300" /> Lectura correcta
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">
            Este cockpit no decide por ti. Ordena la atención: primero contexto, después tesis, luego cartera y finalmente simulación.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-100">
            <BarChart3 size={16} className="text-sky-300" /> Uso avanzado
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">
            Si macro, técnico y fundamentales se contradicen, la respuesta profesional suele ser esperar o reducir tamaño.
          </p>
        </div>
      </div>
    </section>
  );
};
