import React from "react";
import { AlertTriangle, ArrowRight, Gauge, Newspaper, TrendingDown } from "lucide-react";
import { OpportunityCandidate } from "../../logic/opportunityRadar";
import { Badge } from "../ui/Badge";
import { ScorePill } from "../ui/ScorePill";

interface OpportunityCatalystPanelProps {
  candidates: OpportunityCandidate[];
  onSelect: (asset: OpportunityCandidate["asset"]) => void;
}

function getBandVariant(band: OpportunityCandidate["riskBand"]): "success" | "warning" | "error" {
  if (band === "prudente") return "success";
  if (band === "vigilar") return "warning";
  return "error";
}

function getBandLabel(band: OpportunityCandidate["riskBand"]): string {
  if (band === "prudente") return "Prudente";
  if (band === "vigilar") return "Vigilar";
  return "Especulativa";
}

export const OpportunityCatalystPanel: React.FC<OpportunityCatalystPanelProps> = ({ candidates, onSelect }) => {
  if (candidates.length === 0) {
    return (
      <div className="border border-dashed border-slate-700 rounded-xl p-6 text-center text-sm text-slate-400">
        No hay suficientes activos para construir el radar de oportunidades.
      </div>
    );
  }

  const topCandidate = candidates[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
        <button
          type="button"
          onClick={() => onSelect(topCandidate.asset)}
          className="text-left rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 hover:border-emerald-400/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">
                <Gauge size={14} />
                Idea destacada
              </div>
              <h4 className="text-2xl font-extrabold text-white">{topCandidate.asset.ticker}</h4>
              <p className="text-sm text-slate-300 mt-1">{topCandidate.asset.name}</p>
            </div>
            <ScorePill score={topCandidate.score} label="radar" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant={getBandVariant(topCandidate.riskBand)}>{getBandLabel(topCandidate.riskBand)}</Badge>
            <Badge variant="info">{topCandidate.setup}</Badge>
            <Badge variant="neutral">{topCandidate.dataLabel}</Badge>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mt-5">{topCandidate.catalyst}</p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {topCandidate.evidence.map(item => (
              <span key={item} className="rounded-lg bg-slate-950/60 border border-white/5 px-3 py-2 text-[11px] text-slate-300">
                {item}
              </span>
            ))}
          </div>
        </button>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">
            <AlertTriangle size={14} />
            Lectura correcta
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Este modulo no recomienda compras. Prioriza activos para investigar cuando combinan caida, potencial,
            calidad y algun posible catalizador. La senal buena es una invitacion a estudiar, no una orden de entrada.
          </p>
          <div className="mt-4 space-y-2">
            {topCandidate.watchPoints.map(point => (
              <div key={point} className="flex gap-2 text-xs text-slate-400">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {candidates.slice(1).map(candidate => (
          <button
            key={candidate.asset.id}
            type="button"
            onClick={() => onSelect(candidate.asset)}
            className="group text-left rounded-xl border border-white/5 bg-slate-950/30 p-4 hover:border-emerald-500/40 hover:bg-slate-900 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{candidate.asset.ticker}</span>
                  <Badge variant={getBandVariant(candidate.riskBand)} className="text-[10px]">
                    {getBandLabel(candidate.riskBand)}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{candidate.asset.name}</p>
              </div>
              <span className="font-mono text-lg font-bold text-emerald-400">{candidate.score}</span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              <TrendingDown size={14} className="text-sky-400" />
              <span>{candidate.setup}</span>
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs text-slate-400">
              <Newspaper size={14} className="text-slate-500 mt-0.5" />
              <span className="line-clamp-2">{candidate.catalyst}</span>
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest">
              <span>{candidate.dataLabel}</span>
              <ArrowRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
