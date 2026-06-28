import React, { useEffect } from "react";
import { ProcessedAsymmetryCompany } from "../../types/asymmetry";
import { ASYMMETRY_WEIGHTS } from "../../logic/asymmetryEngine";
import { Badge } from "../ui/Badge";
import { ScorePill } from "../ui/ScorePill";
import { signalVariant, riskVariant, formatMarketCap } from "./asymmetryUi";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  FileText,
  Target,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  XOctagon,
  BarChart3,
  ShieldAlert,
} from "lucide-react";
import { AsymmetryMovementExplainer } from "../education/AssetMovementExplainer";

interface AsymmetryDetailModalProps {
  company: ProcessedAsymmetryCompany | null;
  onClose: () => void;
  id?: string;
}

const fcfLabel: Record<string, string> = {
  positivo_creciente: "Positivo y creciente",
  positivo_irregular: "Positivo pero irregular",
  negativo: "Negativo",
};

/** Formatea un número opcional con sufijo, o "N/D" si es null. */
const fmt = (v: number | null, suffix = "", digits = 0): string =>
  v === null ? "N/D" : `${v.toFixed(digits)}${suffix}`;

const BLOCKS: { key: keyof typeof ASYMMETRY_WEIGHTS; label: string }[] = [
  { key: "growth", label: "Crecimiento" },
  { key: "margins", label: "Márgenes" },
  { key: "fcf", label: "Flujo de caja libre" },
  { key: "valuation", label: "Valoración (PEG)" },
  { key: "debt", label: "Deuda" },
  { key: "drawdown", label: "Caída desde máximos" },
  { key: "sector", label: "Sector / viento de cola" },
  { key: "momentum", label: "Momentum reciente" },
];

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-xs py-1.5 border-b border-white/5 last:border-0">
    <span className="text-slate-400">{label}</span>
    <span className="text-slate-100 font-semibold font-mono">{value}</span>
  </div>
);

const NarrativeList: React.FC<{
  title: string;
  items: string[];
  icon: React.ReactNode;
  tone: string;
}> = ({ title, items, icon, tone }) => (
  <div>
    <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 ${tone}`}>
      {icon} {title}
    </h4>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-slate-300 flex gap-2">
          <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${tone.replace("text-", "bg-")}`} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export const AsymmetryDetailModal: React.FC<AsymmetryDetailModalProps> = ({
  company,
  onClose,
  id,
}) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!company) return null;

  return (
    <AnimatePresence>
      <div id={id} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:items-center sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] bg-slate-900 border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-4 py-4 sm:px-8 sm:py-6 border-b border-white/5 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-900 to-slate-800">
            <div className="flex min-w-0 items-center gap-3 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-shrink-0 items-center justify-center text-emerald-400 font-bold text-xl sm:text-2xl">
                {company.ticker.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl sm:text-3xl font-bold text-white leading-tight">{company.name}</h2>
                  <Badge variant="neutral" className="font-mono">
                    {company.ticker}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-2 text-slate-400 text-sm flex-wrap">
                  <span>{company.country}</span>
                  <span className="text-slate-600">·</span>
                  <span className="italic">{company.sector}</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={signalVariant(company.signal)}>{company.signal}</Badge>
                  <Badge variant={riskVariant(company.riskLevel)}>Riesgo: {company.riskLevel}</Badge>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar detalle"
              className="h-11 w-11 flex-shrink-0 rounded-full border border-white/10 bg-slate-950/60 text-slate-300 transition-colors hover:bg-white/10 hover:text-white flex items-center justify-center"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Columna izquierda: score, desglose y métricas */}
              <div className="space-y-6">
                <div className="bg-slate-800/40 rounded-2xl p-6 border border-white/5 flex flex-col items-center">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                    Score de Asimetría
                  </h3>
                  <ScorePill score={company.score} size="lg" />
                </div>

                <div className="bg-slate-800/40 rounded-2xl p-6 border border-white/5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <BarChart3 size={14} /> Score desglosado
                  </h3>
                  <div className="space-y-3">
                    {BLOCKS.map(({ key, label }) => {
                      const points = company.breakdown[key];
                      const max = ASYMMETRY_WEIGHTS[key];
                      const pct = max > 0 ? (points / max) * 100 : 0;
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-300">{label}</span>
                            <span className="text-slate-400 font-mono">
                              {points}/{max}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between text-xs pt-3 mt-2 border-t border-white/5 font-bold">
                      <span className="text-white">Total</span>
                      <span className="text-emerald-400 font-mono">{company.score}/100</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-2xl p-6 border border-white/5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Métricas principales
                  </h3>
                  <Metric
                    label="Precio actual"
                    value={
                      company.price === null
                        ? "N/D"
                        : `${company.price.toLocaleString("es-ES")} ${company.currency}`
                    }
                  />
                  <Metric
                    label="Capitalización"
                    value={formatMarketCap(company.marketCap, company.currency)}
                  />
                  <Metric label="Caída desde máx. 52s" value={fmt(company.drawdownFrom52wHigh, "%")} />
                  <Metric label="Crecimiento ingresos" value={fmt(company.revenueGrowth, "%")} />
                  <Metric label="Margen operativo" value={fmt(company.operatingMargin, "%")} />
                  <Metric label="Deuda neta / EBITDA" value={fmt(company.netDebtToEbitda, "", 1)} />
                  <Metric label="PER" value={fmt(company.per, "", 0)} />
                  <Metric label="PEG" value={fmt(company.peg, "", 1)} />
                  <Metric
                    label="Flujo de caja libre"
                    value={company.fcf === null ? "N/D" : fcfLabel[company.fcf]}
                  />
                  <Metric label="Momentum 3 meses" value={fmt(company.momentum3m, "%")} />
                </div>
              </div>

              {/* Columna derecha: narrativa */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-sky-400">
                    <FileText size={14} /> Resumen ejecutivo
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{company.executiveSummary}</p>
                </div>

                <div className="bg-slate-800/40 rounded-2xl p-5 border border-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-emerald-400">
                    <Target size={14} /> Por qué aparece en el ranking
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{company.rankingReason}</p>
                </div>

                <AsymmetryMovementExplainer company={company} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <NarrativeList
                    title="Puntos fuertes"
                    items={company.strengths}
                    icon={<CheckCircle2 size={14} />}
                    tone="text-emerald-400"
                  />
                  <NarrativeList
                    title="Riesgos principales"
                    items={company.risks}
                    icon={<AlertTriangle size={14} />}
                    tone="text-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <NarrativeList
                    title="Qué tendría que pasar para que suba"
                    items={company.catalystsToRise}
                    icon={<TrendingUp size={14} />}
                    tone="text-sky-400"
                  />
                  <NarrativeList
                    title="Señales para descartarla"
                    items={company.redFlagsToDiscard}
                    icon={<XOctagon size={14} />}
                    tone="text-rose-400"
                  />
                </div>

                {company.riskFactors.length > 0 && (
                  <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5">
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-rose-400">
                      <ShieldAlert size={14} /> Factores de riesgo detectados ({company.riskLevel})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {company.riskFactors.map((f, i) => (
                        <Badge key={i} variant="error">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {company.deteriorationFactors.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-amber-400">
                      <TrendingDown size={14} /> Factores de deterioro detectados
                    </h4>
                    <ul className="space-y-2">
                      {company.deteriorationFactors.map((f, i) => (
                        <li key={i} className="text-sm text-slate-300 flex gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0 bg-amber-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 text-[11px] text-slate-500 italic text-center border-t border-white/5 pt-5">
              Este score no es una recomendación de compra. Es una herramienta de análisis
              orientativa con fines educativos. Toda inversión conlleva riesgo. Datos
              {company.isMockData ? " simulados" : ""} sujetos a errores o retrasos.
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
