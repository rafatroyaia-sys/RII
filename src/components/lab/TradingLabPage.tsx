import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  FlaskConical,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { ProcessedAsset, RiskLevel } from "../../types";
import { SectionCard } from "../ui/SectionCard";
import { ThesisBuilderPanel } from "./ThesisBuilderPanel";

type LabStrategyId = "quality" | "pullback" | "momentum";

interface TradingLabPageProps {
  assets: ProcessedAsset[];
  userProfile: { score: number; name: string } | null;
  onSelectAsset: (asset: ProcessedAsset) => void;
}

const strategies: Record<LabStrategyId, {
  name: string;
  shortName: string;
  description: string;
  rule: string;
  riskNote: string;
}> = {
  quality: {
    name: "Calidad defensiva",
    shortName: "Calidad",
    description: "Busca activos con confianza alta, riesgo contenido y encaje educativo para principiantes.",
    rule: "Compra simulada cuando calidad y simplicidad pesan mas que potencial especulativo.",
    riskNote: "Menos agresiva; puede quedarse fuera de subidas rapidas."
  },
  pullback: {
    name: "Caida controlada",
    shortName: "Caida",
    description: "Estudia activos castigados cerca de zonas bajas, pero exige confianza y riesgo razonable.",
    rule: "Entrada simulada solo si la caida no viene acompanada de deterioro extremo.",
    riskNote: "Puede confundir una oportunidad con una empresa que sigue empeorando."
  },
  momentum: {
    name: "Momento prudente",
    shortName: "Momento",
    description: "Prioriza activos con tendencia positiva y evita los de riesgo extremo.",
    rule: "Sigue fuerza relativa, pero corta el peso si el riesgo educativo es demasiado alto.",
    riskNote: "Puede entrar tarde si el mercado ya ha descontado la noticia."
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const fmtEuro = (value: number) => new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
}).format(value);

const fmtPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

function getChange(asset: ProcessedAsset, fallback: number) {
  return asset.marketData?.changePercent1Y
    ?? asset.marketData?.oneYearChangePercent
    ?? asset.marketData?.changePercent6M
    ?? asset.marketData?.changePercent1M
    ?? fallback;
}

function scoreAsset(asset: ProcessedAsset, strategy: LabStrategyId) {
  const oneYear = getChange(asset, (asset.scores.potential - asset.scores.risk) * 0.18);
  const oneMonth = asset.marketData?.changePercent1M ?? asset.marketData?.oneMonthChangePercent ?? oneYear / 12;
  const nearLow = asset.marketData?.price && asset.marketData?.low52Week
    ? clamp(100 - ((asset.marketData.price - asset.marketData.low52Week) / Math.max(asset.marketData.low52Week, 1)) * 100, 0, 100)
    : 35;

  if (strategy === "quality") {
    return asset.scores.trust * 0.35
      + asset.scores.beginnerFriendly * 0.25
      + asset.scores.longTermFit * 0.2
      + (100 - asset.scores.risk) * 0.2;
  }

  if (strategy === "pullback") {
    const pullback = oneMonth < 0 ? Math.abs(oneMonth) * 4 : 0;
    return nearLow * 0.25
      + pullback
      + asset.scores.trust * 0.25
      + asset.scores.valuation * 0.2
      - asset.scores.risk * 0.2;
  }

  return Math.max(oneYear, 0) * 1.2
    + Math.max(oneMonth, 0) * 1.8
    + asset.scores.trust * 0.25
    + asset.scores.mediumTermFit * 0.2
    - asset.scores.risk * 0.15;
}

function riskPenalty(asset: ProcessedAsset) {
  if (asset.riskLevel === RiskLevel.Extremo) return 1.35;
  if (asset.riskLevel === RiskLevel.Alto) return 1.1;
  if (asset.riskLevel === RiskLevel.Medio) return 0.8;
  return 0.55;
}

export const TradingLabPage: React.FC<TradingLabPageProps> = ({ assets, userProfile, onSelectAsset }) => {
  const [strategy, setStrategy] = useState<LabStrategyId>("quality");
  const [capital, setCapital] = useState(5000);
  const [monthlyContribution, setMonthlyContribution] = useState(250);

  const selectedAssets = useMemo(() => {
    return [...assets]
      .filter(asset => strategy !== "momentum" || asset.riskLevel !== RiskLevel.Extremo)
      .sort((a, b) => scoreAsset(b, strategy) - scoreAsset(a, strategy))
      .slice(0, 6);
  }, [assets, strategy]);

  const simulation = useMemo(() => {
    const totalInvested = capital + monthlyContribution * 12;
    if (selectedAssets.length === 0) {
      return {
        expectedReturn: 0,
        estimatedValue: totalInvested,
        estimatedProfit: 0,
        maxDrawdown: 0,
        riskScore: 0,
        operations: []
      };
    }

    const avgReturn = selectedAssets.reduce((sum, asset) => {
      const historical = getChange(asset, (asset.scores.potential - asset.scores.risk) * 0.18);
      const qualityBoost = (asset.scores.trust - 50) * 0.08;
      const strategyBoost = strategy === "quality" ? 1.5 : strategy === "momentum" ? 2.2 : 0.6;
      return sum + clamp(historical + qualityBoost + strategyBoost, -35, 38);
    }, 0) / selectedAssets.length;

    const riskScore = selectedAssets.reduce((sum, asset) => sum + asset.scores.risk, 0) / selectedAssets.length;
    const drawdown = selectedAssets.reduce((sum, asset) => sum + asset.scores.risk * riskPenalty(asset), 0) / selectedAssets.length;
    const riskAdjustedReturn = avgReturn - Math.max(0, riskScore - 60) * 0.12;
    const estimatedValue = totalInvested * (1 + riskAdjustedReturn / 100);
    const operations = selectedAssets.slice(0, 5).map((asset, index) => ({
      asset,
      action: index < 3 ? "Comprar simulado" : "Vigilar",
      amount: totalInvested * (index < 3 ? 0.18 : 0.08),
      reason: strategy === "quality"
        ? `Confianza ${asset.scores.trust}/100 y riesgo ${asset.riskLevel.toLowerCase()}`
        : strategy === "pullback"
          ? `Caida/valoracion para estudiar sin orden real`
          : `Tendencia y encaje de medio plazo para observar`
    }));

    return {
      expectedReturn: riskAdjustedReturn,
      estimatedValue,
      estimatedProfit: estimatedValue - totalInvested,
      maxDrawdown: clamp(drawdown * 0.42, 6, 42),
      riskScore,
      operations
    };
  }, [capital, monthlyContribution, selectedAssets, strategy]);

  const suitability = userProfile
    ? simulation.riskScore <= userProfile.score + 20
      ? "Compatible con tu perfil para estudiar"
      : "Demasiado agresivo para tu perfil actual"
    : "Haz el test de perfil para medir compatibilidad";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_-10px_rgba(6,182,212,0.16)]">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-cyan-300 mb-3">
              <FlaskConical size={24} />
              <span className="text-xs font-bold uppercase tracking-widest">Laboratorio educativo</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-3">Simulador de estrategias y paper trading</h2>
            <p className="text-slate-300 leading-relaxed">
              Prueba reglas de inversion con datos educativos, registra operaciones simuladas y mide riesgo antes de pensar en cualquier automatizacion. No conecta con brokers, no ejecuta ordenes y no usa dinero real.
            </p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-sm text-amber-100 max-w-sm">
            <div className="flex items-start gap-2 font-bold mb-1">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              Modo seguro
            </div>
            Todo resultado es simulado. Sirve para aprender disciplina, no para prometer rentabilidad.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <SectionCard
          title="Estrategia"
          subtitle="Elige una regla de estudio"
          icon={<ClipboardList size={18} />}
          className="xl:col-span-1"
        >
          <div className="space-y-3">
            {(Object.entries(strategies) as [LabStrategyId, typeof strategies[LabStrategyId]][]).map(([id, item]) => (
              <button
                key={id}
                onClick={() => setStrategy(id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  strategy === id
                    ? "bg-cyan-500/10 border-cyan-400/60 text-white"
                    : "bg-slate-800/70 border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                <div className="font-bold mb-1">{item.name}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{item.description}</div>
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Capital inicial simulado</span>
              <input
                type="number"
                min={0}
                step={500}
                value={capital}
                onChange={event => setCapital(Number(event.target.value) || 0)}
                className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Aportacion mensual simulada</span>
              <input
                type="number"
                min={0}
                step={50}
                value={monthlyContribution}
                onChange={event => setMonthlyContribution(Number(event.target.value) || 0)}
                className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
              />
            </label>
          </div>
        </SectionCard>

        <div className="xl:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/70 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-2">
                <TrendingUp size={14} /> Retorno
              </div>
              <div className="text-2xl font-extrabold text-white">{fmtPct(simulation.expectedReturn)}</div>
              <p className="text-xs text-slate-500 mt-1">Estimacion a 12 meses</p>
            </div>
            <div className="bg-slate-900/70 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-2">
                <BarChart3 size={14} /> Resultado
              </div>
              <div className={`text-2xl font-extrabold ${simulation.estimatedProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {fmtEuro(simulation.estimatedProfit)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Sobre capital y aportaciones</p>
            </div>
            <div className="bg-slate-900/70 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-widest mb-2">
                <Activity size={14} /> Caida max.
              </div>
              <div className="text-2xl font-extrabold text-white">-{simulation.maxDrawdown.toFixed(1)}%</div>
              <p className="text-xs text-slate-500 mt-1">Stress test simple</p>
            </div>
            <div className="bg-slate-900/70 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-widest mb-2">
                <ShieldCheck size={14} /> Perfil
              </div>
              <div className="text-sm font-bold text-white leading-tight">{suitability}</div>
              <p className="text-xs text-slate-500 mt-1">Riesgo medio {simulation.riskScore.toFixed(0)}/100</p>
            </div>
          </div>

          <SectionCard
            title="Backtest educativo"
            subtitle={strategies[strategy].rule}
            icon={<BarChart3 size={18} />}
          >
            <div className="space-y-3">
              {selectedAssets.map(asset => {
                const score = clamp(scoreAsset(asset, strategy), 0, 100);
                return (
                  <button
                    key={asset.id}
                    onClick={() => onSelectAsset(asset)}
                    className="w-full grid grid-cols-1 md:grid-cols-[1.2fr_2fr_auto] gap-3 items-center p-4 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-cyan-400/60 transition-colors text-left"
                  >
                    <div>
                      <div className="text-white font-bold">{asset.name}</div>
                      <div className="text-xs text-slate-500">{asset.ticker} · {asset.type} · Riesgo {asset.riskLevel}</div>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-cyan-300 font-extrabold">{score.toFixed(0)}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">score lab</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 text-sm text-slate-400 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              Riesgo de la regla: {strategies[strategy].riskNote}
            </div>
          </SectionCard>

          <SectionCard
            title="Diario de paper trading"
            subtitle="Operaciones simuladas que la regla registraria hoy"
            icon={<ClipboardList size={18} />}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-800">
                    <th className="pb-3 font-bold">Accion</th>
                    <th className="pb-3 font-bold">Activo</th>
                    <th className="pb-3 font-bold text-right">Importe</th>
                    <th className="pb-3 font-bold">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.operations.map(operation => (
                    <tr key={`${operation.asset.id}-${operation.action}`} className="border-b border-slate-800/70">
                      <td className="py-3 text-cyan-300 font-bold">{operation.action}</td>
                      <td className="py-3 text-white">{operation.asset.ticker}</td>
                      <td className="py-3 text-right text-slate-300">{fmtEuro(operation.amount)}</td>
                      <td className="py-3 text-slate-400">{operation.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Tesis antes de actuar"
            subtitle="Escribe la idea, sus riesgos y la condicion que la invalidaria"
            icon={<ClipboardList size={18} />}
          >
            <ThesisBuilderPanel assets={assets} onSelectAsset={onSelectAsset} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
