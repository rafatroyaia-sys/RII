import React, { useMemo, useState } from "react";
import { ArrowRightLeft, BarChart3, CheckCircle2, Eye, ShieldAlert } from "lucide-react";
import { ProcessedAsset } from "../../types";
import { ScorePill } from "../ui/ScorePill";

interface AssetComparisonPanelProps {
  assets: ProcessedAsset[];
  onSelect: (asset: ProcessedAsset) => void;
}

function getInitialTicker(assets: ProcessedAsset[], index: number) {
  return assets[index]?.ticker ?? assets[0]?.ticker ?? "";
}

function scoreTone(value: number, invert = false) {
  const good = invert ? value <= 40 : value >= 70;
  const caution = invert ? value <= 65 : value >= 50;
  if (good) return "text-emerald-300";
  if (caution) return "text-amber-300";
  return "text-rose-300";
}

const MetricRow: React.FC<{
  label: string;
  left: string | number;
  right: string | number;
  leftTone?: string;
  rightTone?: string;
}> = ({ label, left, right, leftTone = "text-slate-200", rightTone = "text-slate-200" }) => (
  <div className="grid grid-cols-[1fr_0.8fr_0.8fr] items-center gap-3 border-b border-slate-800/80 py-3 last:border-0">
    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
    <span className={`text-right text-sm font-bold ${leftTone}`}>{left}</span>
    <span className={`text-right text-sm font-bold ${rightTone}`}>{right}</span>
  </div>
);

function buildComparisonReading(left: ProcessedAsset, right: ProcessedAsset) {
  const leftScore = left.opportunityScore - left.scores.risk * 0.25 + left.scores.trust * 0.15;
  const rightScore = right.opportunityScore - right.scores.risk * 0.25 + right.scores.trust * 0.15;
  const safer = left.scores.risk <= right.scores.risk ? left : right;
  const stronger = leftScore >= rightScore ? left : right;

  if (stronger.ticker === safer.ticker) {
    return `${stronger.ticker} parece más equilibrado en esta comparación: mejor mezcla de oportunidad, confianza y riesgo relativo.`;
  }

  return `${stronger.ticker} destaca por oportunidad, pero ${safer.ticker} parece más defensivo. La decisión educativa depende del perfil y del tamaño de posición.`;
}

export const AssetComparisonPanel: React.FC<AssetComparisonPanelProps> = ({ assets, onSelect }) => {
  const sortedAssets = useMemo(
    () => [...assets].sort((a, b) => b.opportunityScore - a.opportunityScore),
    [assets]
  );

  const [leftTicker, setLeftTicker] = useState(() => getInitialTicker(sortedAssets, 0));
  const [rightTicker, setRightTicker] = useState(() => getInitialTicker(sortedAssets, 1));

  const left = sortedAssets.find((asset) => asset.ticker === leftTicker) ?? sortedAssets[0];
  const right = sortedAssets.find((asset) => asset.ticker === rightTicker) ?? sortedAssets[1] ?? sortedAssets[0];

  if (!left || !right) return null;

  const reading = buildComparisonReading(left, right);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <ArrowRightLeft size={18} className="text-emerald-300" />
            Comparador rápido de activos
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
            Compara dos ideas antes de abrir una ficha: no gana siempre la que más sube, sino la que encaja mejor con riesgo, valoración y horizonte.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[460px]">
          <select
            value={left.ticker}
            onChange={(event) => setLeftTicker(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-emerald-500"
          >
            {sortedAssets.map((asset) => (
              <option key={asset.ticker} value={asset.ticker}>{asset.ticker} · {asset.name}</option>
            ))}
          </select>
          <select
            value={right.ticker}
            onChange={(event) => setRightTicker(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-emerald-500"
          >
            {sortedAssets.map((asset) => (
              <option key={asset.ticker} value={asset.ticker}>{asset.ticker} · {asset.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.4fr_0.9fr]">
        <article className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-bold text-emerald-300">{left.ticker}</p>
              <h4 className="mt-1 font-bold text-white">{left.name}</h4>
              <p className="mt-1 text-xs text-slate-500">{left.type} · {left.sector}</p>
            </div>
            <ScorePill score={left.opportunityScore} />
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{left.summary}</p>
          <button onClick={() => onSelect(left)} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-300 hover:text-emerald-200">
            <Eye size={14} /> Abrir ficha
          </button>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-2 grid grid-cols-[1fr_0.8fr_0.8fr] gap-3">
            <span />
            <span className="text-right text-xs font-black uppercase tracking-widest text-slate-500">{left.ticker}</span>
            <span className="text-right text-xs font-black uppercase tracking-widest text-slate-500">{right.ticker}</span>
          </div>
          <MetricRow label="Oportunidad" left={left.opportunityScore} right={right.opportunityScore} leftTone={scoreTone(left.opportunityScore)} rightTone={scoreTone(right.opportunityScore)} />
          <MetricRow label="Potencial" left={left.scores.potential} right={right.scores.potential} leftTone={scoreTone(left.scores.potential)} rightTone={scoreTone(right.scores.potential)} />
          <MetricRow label="Riesgo" left={left.scores.risk} right={right.scores.risk} leftTone={scoreTone(left.scores.risk, true)} rightTone={scoreTone(right.scores.risk, true)} />
          <MetricRow label="Confianza" left={left.scores.trust} right={right.scores.trust} leftTone={scoreTone(left.scores.trust)} rightTone={scoreTone(right.scores.trust)} />
          <MetricRow label="Valoración" left={left.valuationLabel} right={right.valuationLabel} />
          <MetricRow label="Horizonte" left={left.recommendedHorizon} right={right.recommendedHorizon} />
          <MetricRow label="Principiante" left={left.beginnerFitLabel} right={right.beginnerFitLabel} />
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-bold text-sky-300">{right.ticker}</p>
              <h4 className="mt-1 font-bold text-white">{right.name}</h4>
              <p className="mt-1 text-xs text-slate-500">{right.type} · {right.sector}</p>
            </div>
            <ScorePill score={right.opportunityScore} />
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{right.summary}</p>
          <button onClick={() => onSelect(right)} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-300 hover:text-emerald-200">
            <Eye size={14} /> Abrir ficha
          </button>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-300">
            <CheckCircle2 size={16} /> Lectura educativa
          </h4>
          <p className="text-sm leading-relaxed text-slate-300">{reading}</p>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-sky-300">
            <BarChart3 size={16} /> Qué comparar
          </h4>
          <p className="text-sm leading-relaxed text-slate-300">Mira si el extra de potencial compensa el extra de riesgo y si el horizonte encaja con tu plan.</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-300">
            <ShieldAlert size={16} /> Señal de pausa
          </h4>
          <p className="text-sm leading-relaxed text-slate-300">Si no puedes explicar la diferencia entre dos activos, todavía no estás comparando: estás eligiendo por impresión.</p>
        </div>
      </div>
    </div>
  );
};
