import React from "react";
import { ProcessedAsset, RiskLevel, MarketData } from "../../types";
import { Badge } from "../ui/Badge";
import { ScorePill } from "../ui/ScorePill";
import { ArrowRight, Info } from "lucide-react";

function safeText(value: unknown, fallback = "No disponible"): string {
  if (value === undefined || value === null || value === "" || value === "undefined" || value === "null") {
    return fallback;
  }
  return String(value);
}

function formatMarketDataLabel(marketData?: MarketData): string {
  if (!marketData) return "Datos simulados";

  if (marketData.status === 'error') {
    return "Datos no disponibles";
  }

  // Handle simulated status
  if (marketData.status === 'simulated') {
    if (marketData.fallbackReason) {
      return "Datos simulados · API no disponible";
    }
    return "Datos simulados";
  }

  let base = "Datos simulados";
  if (marketData.status === 'real' && !marketData.fromCache) {
    base = "Datos reales";
  } else if (marketData.status === 'real' && marketData.fromCache) {
    base = "Datos reales en caché";
  } else if (marketData.stale || marketData.status === 'partial') {
    base = "Último dato guardado";
  }

  const prov = safeText(marketData.provider, "datos simulados");
  if (prov !== "datos simulados" && prov !== "No disponible") {
    return `${base} · ${prov}`;
  }
  return base;
}

interface AssetTableProps {
  assets: ProcessedAsset[];
  onSelect: (asset: ProcessedAsset) => void;
  id?: string;
  userProfile?: { score: number, name: string } | null;
}

export const AssetTable: React.FC<AssetTableProps> = ({ assets, onSelect, id, userProfile }) => {
  const getRiskVariant = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.Bajo: return "success";
      case RiskLevel.Medio: return "warning";
      case RiskLevel.Alto: return "error";
      case RiskLevel.Extremo: return "error";
      default: return "neutral";
    }
  };

  const EducationalLabel = ({ risk, userScore }: { risk: RiskLevel, userScore: number }) => {
    // Map risk to a numeric value for easier comparison
    let r = 0;
    if (risk === RiskLevel.Bajo) r = 20;
    else if (risk === RiskLevel.Medio) r = 50;
    else if (risk === RiskLevel.Alto) r = 80;
    else r = 100;

    let text = "Requiere estudio previo";
    let color = "text-slate-400 bg-slate-900 border-slate-700";

    if (userScore >= r) {
      text = "Riesgo tolerado por tu perfil";
      color = "text-emerald-400 bg-emerald-950/50 border-emerald-800/50";
    } else if (r - userScore > 40) {
      text = "Demasiado riesgo (Solo estudio)";
      color = "text-amber-400 bg-amber-950/50 border-amber-800/50";
    } else {
      text = "Riesgo superior a tu perfil";
      color = "text-orange-400 bg-orange-950/50 border-orange-800/50";
    }

    return (
      <div className={`mt-2 text-[10px] font-bold px-2 py-1 rounded-full border inline-block w-fit ${color}`}>
        {text}
      </div>
    );
  };

  return (
    <div id={id} className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            <th className="px-4 py-4 font-bold">#</th>
            <th className="px-4 py-4 font-bold">Activo</th>
            <th className="px-4 py-4 font-bold">Tipo / Sector</th>
            <th className="px-4 py-4 font-bold text-center">Opportunity</th>
            <th className="px-4 py-4 font-bold text-center">Riesgo</th>
            <th className="px-4 py-4 font-bold">Estado Prudente</th>
            <th className="px-4 py-4 font-bold"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {assets.map((asset, index) => (
            <tr key={asset.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => onSelect(asset)}>
              <td className="px-4 py-4 text-xs font-mono text-slate-500">{index + 1}</td>
              <td className="px-4 py-4">
                <div className="flex flex-col">
                  <span className="font-bold text-white text-sm">{asset.ticker}</span>
                  <span className="text-[10px] text-slate-400 mb-1">{asset.name}</span>
                  {asset.marketData && asset.marketData.price !== null && (
                    <div className="flex flex-col gap-0.5 mt-1">
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-slate-300 font-mono">
                          {asset.marketData.price.toFixed(2)} {asset.marketData.currency}
                        </span>
                        {asset.marketData.changePercent1D !== null && (
                          <span className={`font-mono ${asset.marketData.changePercent1D >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {asset.marketData.changePercent1D > 0 ? "+" : ""}{asset.marketData.changePercent1D.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <span className={`text-[8px] uppercase tracking-wider ${
                        asset.marketData.status === 'real' && !asset.marketData.fromCache ? 'text-emerald-500/70' : 
                        asset.marketData.status === 'real' && asset.marketData.fromCache ? 'text-sky-500/70' :
                        asset.marketData.stale ? 'text-amber-500/70' :
                        'text-orange-500/70'
                      }`}>
                        {formatMarketDataLabel(asset.marketData)}
                      </span>
                    </div>
                  )}
                  {(!asset.marketData || asset.marketData.price === null) && (
                     <span className={`text-[8px] uppercase tracking-wider mt-1 ${asset.marketData?.status === 'error' ? 'text-red-400/70' : (asset.marketData?.errorReason ? 'text-orange-500/70' : 'text-slate-500/70')}`}>
                        {formatMarketDataLabel(asset.marketData)}
                     </span>
                  )}
                  {userProfile && (
                    <EducationalLabel risk={asset.riskLevel} userScore={userProfile.score} />
                  )}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-300">{asset.type}</span>
                  <span className="text-[10px] text-slate-500 italic">{asset.sector}</span>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-center">
                  <ScorePill score={asset.opportunityScore} size="sm" />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-center">
                  <Badge variant={getRiskVariant(asset.riskLevel)}>{asset.riskLevel}</Badge>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-slate-300">{asset.prudentLabel}</span>
                  <div className="flex items-center gap-1 opacity-60">
                    <Info className="w-3 h-3 text-sky-400" />
                    <span className="text-[9px] text-slate-500">{asset.valuationLabel}</span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-right">
                <button className="p-2 rounded-full hover:bg-emerald-500/10 text-slate-500 group-hover:text-emerald-400 transition-all">
                  <ArrowRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
