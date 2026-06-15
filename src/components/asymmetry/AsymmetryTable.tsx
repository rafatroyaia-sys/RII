import React from "react";
import { ProcessedAsymmetryCompany } from "../../types/asymmetry";
import { Badge } from "../ui/Badge";
import { ScorePill } from "../ui/ScorePill";
import { ArrowRight, TrendingDown } from "lucide-react";
import { signalVariant, riskVariant } from "./asymmetryUi";

interface AsymmetryTableProps {
  companies: ProcessedAsymmetryCompany[];
  onSelect: (company: ProcessedAsymmetryCompany) => void;
  id?: string;
}

const fcfLabel: Record<string, string> = {
  positivo_creciente: "Positivo y creciente",
  positivo_irregular: "Positivo irregular",
  negativo: "Negativo",
};

/** Marca de dato no disponible. */
const ND = <span className="font-mono text-xs text-slate-600">N/D</span>;

const Num: React.FC<{ value: string; tone?: "pos" | "neg" | "neutral" }> = ({
  value,
  tone = "neutral",
}) => {
  const color =
    tone === "pos" ? "text-emerald-400" : tone === "neg" ? "text-rose-400" : "text-slate-300";
  return <span className={`font-mono text-xs ${color}`}>{value}</span>;
};

export const AsymmetryTable: React.FC<AsymmetryTableProps> = ({ companies, onSelect, id }) => {
  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No hay empresas que cumplan los filtros seleccionados.
      </div>
    );
  }

  return (
    <div id={id} className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1100px]">
        <thead>
          <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            <th className="px-3 py-4">#</th>
            <th className="px-3 py-4">Empresa</th>
            <th className="px-3 py-4">País / Sector</th>
            <th className="px-3 py-4 text-right">Precio</th>
            <th className="px-3 py-4 text-right">Caída 52s</th>
            <th className="px-3 py-4 text-right">Crec. ing.</th>
            <th className="px-3 py-4 text-right">M. oper.</th>
            <th className="px-3 py-4 text-right">Deuda/EBITDA</th>
            <th className="px-3 py-4 text-right">PER</th>
            <th className="px-3 py-4">FCF</th>
            <th className="px-3 py-4 text-right">Mom. 3m</th>
            <th className="px-3 py-4 text-center">Score</th>
            <th className="px-3 py-4 text-center">Riesgo</th>
            <th className="px-3 py-4">Señal</th>
            <th className="px-3 py-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {companies.map((c, index) => (
            <tr
              key={c.id}
              className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
              onClick={() => onSelect(c)}
            >
              <td className="px-3 py-4 text-xs font-mono text-slate-500">{index + 1}</td>
              <td className="px-3 py-4">
                <div className="flex flex-col">
                  <span className="font-bold text-white text-sm">{c.ticker}</span>
                  <span className="text-[10px] text-slate-400">{c.name}</span>
                </div>
              </td>
              <td className="px-3 py-4">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-300">{c.country}</span>
                  <span className="text-[10px] text-slate-500 italic">{c.sector}</span>
                </div>
              </td>
              <td className="px-3 py-4 text-right">
                {c.price === null ? ND : (
                  <Num value={`${c.price.toLocaleString("es-ES")} ${c.currency}`} />
                )}
              </td>
              <td className="px-3 py-4 text-right">
                {c.drawdownFrom52wHigh === null ? ND : (
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-rose-400">
                    <TrendingDown size={12} />-{c.drawdownFrom52wHigh}%
                  </span>
                )}
              </td>
              <td className="px-3 py-4 text-right">
                {c.revenueGrowth === null ? ND : (
                  <Num
                    value={`${c.revenueGrowth > 0 ? "+" : ""}${c.revenueGrowth}%`}
                    tone={c.revenueGrowth >= 10 ? "pos" : c.revenueGrowth < 5 ? "neg" : "neutral"}
                  />
                )}
              </td>
              <td className="px-3 py-4 text-right">
                {c.operatingMargin === null ? ND : <Num value={`${c.operatingMargin}%`} />}
              </td>
              <td className="px-3 py-4 text-right">
                {c.netDebtToEbitda === null ? ND : (
                  <Num
                    value={c.netDebtToEbitda.toFixed(1)}
                    tone={c.netDebtToEbitda < 1 ? "pos" : c.netDebtToEbitda > 4 ? "neg" : "neutral"}
                  />
                )}
              </td>
              <td className="px-3 py-4 text-right">
                {c.per === null ? ND : <Num value={c.per.toFixed(0)} />}
              </td>
              <td className="px-3 py-4">
                {c.fcf === null ? ND : (
                  <span
                    className={`text-[10px] font-semibold ${
                      c.fcf === "negativo"
                        ? "text-rose-400"
                        : c.fcf === "positivo_creciente"
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {fcfLabel[c.fcf]}
                  </span>
                )}
              </td>
              <td className="px-3 py-4 text-right">
                {c.momentum3m === null ? ND : (
                  <Num
                    value={`${c.momentum3m > 0 ? "+" : ""}${c.momentum3m}%`}
                    tone={c.momentum3m > 0 ? "pos" : c.momentum3m < 0 ? "neg" : "neutral"}
                  />
                )}
              </td>
              <td className="px-3 py-4">
                <div className="flex justify-center">
                  <ScorePill score={c.score} size="sm" />
                </div>
              </td>
              <td className="px-3 py-4">
                <div className="flex justify-center">
                  <Badge variant={riskVariant(c.riskLevel)}>{c.riskLevel}</Badge>
                </div>
              </td>
              <td className="px-3 py-4">
                <Badge variant={signalVariant(c.signal)}>{c.signal}</Badge>
              </td>
              <td className="px-3 py-4 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(c);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/10 text-slate-300 group-hover:text-emerald-400 text-[11px] font-bold border border-slate-700 transition-all whitespace-nowrap"
                >
                  Ver análisis <ArrowRight size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
