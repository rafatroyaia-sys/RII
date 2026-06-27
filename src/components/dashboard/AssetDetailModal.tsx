import React, { useState, useEffect } from "react";
import { ProcessedAsset, MentorProfile, MarketData, RiskLevel } from "../../types";
import { 
  X, 
  Info, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Newspaper,
  BookOpen,
  MapPin,
  Users,
  Lightbulb,
  Clock,
  ShieldAlert,
  Calculator,
  UserCheck,
  Copy,
  ClipboardCheck
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { ScorePill } from "../ui/ScorePill";
import { MentorScoreCard } from "../knowledge/MentorScoreCard";
import { motion, AnimatePresence } from "motion/react";
import { allKnowledgeRules } from "../../data/knowledgeRules";
import { getRelevantKnowledgeRules } from "../../logic/knowledgeMatcher";
import { assetMappings } from "../../data/assetMappings";
import { fetchMarketHistorical } from "../../services/marketDataService";

interface AssetDetailModalProps {
  asset: ProcessedAsset | null;
  onClose: () => void;
  mentors: MentorProfile[];
  id?: string;
  userProfile?: { score: number; name: string } | null;
  onCalculateAsset?: (asset: ProcessedAsset, customReturn: number) => void;
}

const scoreBreakdownItems = [
  { key: "potential", label: "Potencial", note: "capacidad de crecimiento o revalorizacion" },
  { key: "trust", label: "Confianza", note: "calidad, solidez y facilidad de seguimiento" },
  { key: "valuation", label: "Precio razonable", note: "comodidad frente a una valoracion exigente" },
  { key: "risk", label: "Riesgo", note: "volatilidad, complejidad y posibilidad de caidas fuertes" },
  { key: "beginnerFriendly", label: "Sencillez", note: "encaje para inversores menos expertos" },
] as const;

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ 
  asset, 
  onClose, 
  mentors, 
  id,
  userProfile,
  onCalculateAsset
}) => {
  const [historicalData, setHistoricalData] = useState<Partial<MarketData> | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);

  useEffect(() => {
    if (asset) {
      setHistoricalData(null);
      const mapping = assetMappings[asset.ticker];
      if (mapping?.enabledForRealMarketData) {
        setIsLoadingHistory(true);
        fetchMarketHistorical(asset.ticker).then(data => {
          setHistoricalData(data);
          setIsLoadingHistory(false);
        }).catch(() => {
          setIsLoadingHistory(false);
        });
      }
    }
  }, [asset]);

  if (!asset) return null;

  const relevantRules = getRelevantKnowledgeRules(asset, allKnowledgeRules);
  const mData = { ...asset.marketData, ...historicalData };
  const valuationComfort = 100 - asset.scores.valuation;

  const copyEducationalBrief = async () => {
    const lines = [
      `Ficha educativa - ${asset.name} (${asset.ticker})`,
      "",
      `Tipo: ${asset.type}`,
      `Sector: ${asset.sector}`,
      `Horizonte sugerido: ${asset.recommendedHorizon}`,
      `Score oportunidad: ${asset.opportunityScore}/100`,
      `Riesgo: ${asset.riskLevel} (${asset.scores.risk}/100)`,
      `Valoracion: ${asset.valuationLabel}`,
      "",
      "Por que esta en el radar:",
      asset.summary,
      asset.radarReason,
      "",
      "Fortalezas:",
      ...asset.pros.map(item => `- ${item}`),
      "",
      "Riesgos:",
      ...asset.cons.map(item => `- ${item}`),
      "",
      "Condiciones a vigilar:",
      ...asset.worseningConditions.map(item => `- ${item}`),
      "",
      "Nota: ficha educativa generada por Radar Inteligente de Inversion. No constituye asesoramiento financiero."
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedBrief(true);
      window.setTimeout(() => setCopiedBrief(false), 2200);
    } catch {
      setCopiedBrief(false);
    }
  };

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
                {asset.ticker.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h2 className="text-xl sm:text-3xl font-bold text-white leading-tight">{asset.name}</h2>
                  <Badge variant="neutral" className="font-mono">{asset.ticker}</Badge>
                  <Badge variant="info">{asset.type}</Badge>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 mt-2 text-slate-400 text-sm flex-wrap">
                  <span className="flex items-center gap-1"><BookOpen size={14} /> {asset.sector}</span>
                  <span className="flex items-center gap-1 text-sky-400"><MapPin size={14} /> {asset.recommendedHorizon}</span>
                  <button
                    onClick={copyEducationalBrief}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/40 px-2.5 py-1 text-xs font-semibold text-slate-200 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
                  >
                    {copiedBrief ? <ClipboardCheck size={14} /> : <Copy size={14} />}
                    {copiedBrief ? "Ficha copiada" : "Copiar ficha"}
                  </button>
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Stats */}
              <div className="space-y-8">
                <div className="bg-slate-800/40 rounded-2xl p-6 border border-white/5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">PUNTUACIONES RADAR</h3>
                  <div className="grid grid-cols-2 gap-y-8">
                    <ScorePill score={asset.opportunityScore} label="Oportunidad" />
                    <ScorePill score={asset.scores.risk} label="Riesgo" />
                    <ScorePill score={asset.shortTermScore} label="Corto Plazo" />
                    <ScorePill score={asset.longTermScore} label="Largo Plazo" />
                  </div>
                  <div className="mt-8 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Nivel de Riesgo:</span>
                      <span className="text-white font-semibold">{asset.riskLevel}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Valoración:</span>
                      <span className="text-white font-semibold">{asset.valuationLabel}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Para Principiantes:</span>
                      <span className="text-emerald-400 font-semibold">{asset.beginnerFitLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-500/5 rounded-2xl p-6 border border-emerald-500/10">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-4 italic">
                    <Info size={16} /> Veredicto Prudente
                  </h3>
                  <p className="text-white font-medium">{asset.prudentLabel}</p>
                </div>

                <div className="bg-slate-800/30 rounded-2xl p-6 border border-white/5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Info size={14} className="text-sky-400" /> Lectura del score
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    La oportunidad prioriza confianza y potencial, suma margen de valoracion y resta riesgo. Los scores de corto y largo plazo cambian segun horizonte, sencillez y tolerancia a volatilidad.
                  </p>
                  <div className="space-y-3">
                    {scoreBreakdownItems.map((item) => {
                      const rawValue = asset.scores[item.key];
                      const displayValue = item.key === "valuation" ? valuationComfort : rawValue;
                      const barColor = item.key === "risk"
                        ? "bg-rose-400"
                        : item.key === "valuation"
                          ? "bg-sky-400"
                          : "bg-emerald-400";
                      return (
                        <div key={item.key}>
                          <div className="flex justify-between gap-3 text-[11px] mb-1">
                            <span className="font-semibold text-slate-200">{item.label}</span>
                            <span className="font-mono text-slate-400">{displayValue}/100</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${displayValue}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">{item.note}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Perfil & Adecuación Card */}
                {userProfile ? (
                  (() => {
                    const userScore = userProfile.score;
                    const risk = asset.riskLevel;
                    let r = 0;
                    if (risk === RiskLevel.Bajo) r = 20;
                    else if (risk === RiskLevel.Medio) r = 50;
                    else if (risk === RiskLevel.Alto) r = 80;
                    else r = 100;

                    let compatibilityText = "";
                    let compatibilityColor = "";
                    let compatibilityBadge = "";
                    let recommendation = "";

                    if (userScore >= r) {
                      compatibilityBadge = "✅ Adecuado para tu perfil";
                      compatibilityColor = "bg-emerald-950/20 border-emerald-500/20 text-emerald-400";
                      compatibilityText = "El nivel de riesgo de este activo se encuentra plenamente dentro de tu rango tolerado.";
                      recommendation = `Como tu perfil es de tipo "${userProfile.name}" (${userScore} pts), cuentas con el horizonte temporal o la tolerancia emocional idónea para estudiar este activo. Recuerda siempre que una base diversificada es la clave del éxito.`;
                    } else if (r - userScore > 40) {
                      compatibilityBadge = "🛑 Riesgo muy superior (Estudio)";
                      compatibilityColor = "bg-rose-950/20 border-rose-500/20 text-rose-400";
                      compatibilityText = "Este activo representa un riesgo excesivo frente a tu tolerancia actual recomendada.";
                      recommendation = `Tus respuestas en el test de perfil indican un enfoque protector del capital. Un activo agresivo como ${asset.ticker} puede presentar caídas drásticas y prolongadas de cotización, lo que causaría estrés excesivo a inversores con perfil "${userProfile.name}". Úsalo con fines didácticos, no de inversión.`;
                    } else {
                      compatibilityBadge = "⚠️ Riesgo superior a tu perfil";
                      compatibilityColor = "bg-amber-950/20 border-amber-500/20 text-amber-400";
                      compatibilityText = "Este activo excede moderadamente la tolerancia al riesgo de tu perfil.";
                      recommendation = `El activo ${asset.ticker} requiere mayor aguante a la volatilidad que el sugerido para tu perfil "${userProfile.name}". Si decides estudiarlo, hazlo con ponderaciones muy pequeñas en tu cartera para amortiguar posibles correcciones repentinas de mercado.`;
                    }

                    // Special case: aggressive investor looking at defensive asset
                    if ((userProfile.name === "Agresivo" || userProfile.name === "Dinámico") && risk === RiskLevel.Bajo) {
                      compatibilityBadge = "💡 Excelente Ancla Defensiva";
                      compatibilityColor = "bg-blue-950/20 border-blue-500/20 text-blue-400";
                      compatibilityText = "Aunque buscas el máximo potencial y toleras riesgos graves, este activo de bajo riesgo aporta robustez.";
                      recommendation = `Dado tu perfil dinámico, podrías ver este activo como 'aburrido'. Sin embargo, los mentores recuerdan que tener activos defensivos estables ayuda a mitigar las pérdidas generales durante crisis de mercado y a tener liquidez para comprar ofertas cuando las bolsas caen.`;
                    }

                    return (
                      <div className={`rounded-2xl p-5 border ${compatibilityColor} space-y-3`}>
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <UserCheck size={16} />
                          <span>Compatibilidad de Perfil</span>
                        </div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5">
                          {compatibilityBadge}
                        </span>
                        <p className="text-xs font-semibold text-slate-200 mt-1 leading-snug">{compatibilityText}</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-2 border-t border-white/5 pt-2">
                          {recommendation}
                        </p>
                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                      <UserCheck size={18} />
                    </div>
                    <h4 className="text-xs font-bold text-slate-300">¿Se adapta este activo a ti?</h4>
                    <p className="text-[11px] text-slate-500 leading-normal">Descubre consejos de adecuación personalizados completando el Test del Perfil de Inversor en la pestaña del menú principal.</p>
                  </div>
                )}

                {/* Compound Interest Synergy Card */}
                {onCalculateAsset && (
                  (() => {
                    let prefilledRate = 6;
                    let sourceLabel = "scoring de oportunidad";
                    
                    if (mData?.oneYearChangePercent !== null && mData?.oneYearChangePercent !== undefined && mData.oneYearChangePercent > 0) {
                      prefilledRate = Math.round(Math.min(15, mData.oneYearChangePercent));
                      sourceLabel = "rentabilidad real anual (1A)";
                    } else if (asset.opportunityScore) {
                      prefilledRate = Math.max(1, Math.round(asset.opportunityScore / 10));
                    }

                    return (
                      <div className="bg-gradient-to-br from-emerald-950/20 to-slate-900 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                          <Calculator size={16} />
                          <span>Simulador de Interés</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Visualiza cuánto podría crecer tu capital aportando mes a mes en este activo a largo plazo con una rentabilidad estimada del **{prefilledRate}%** (basada en {sourceLabel}).
                        </p>
                        <button
                          onClick={() => onCalculateAsset(asset, prefilledRate)}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 hover:shadow-emerald-500/20 active:scale-[0.98]"
                        >
                          <Calculator size={14} />
                          Proyectar con Interés Compuesto
                        </button>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Middle Column: Analysis */}
              <div className="lg:col-span-2 space-y-8">
                <section>
                  <h3 className="text-xl font-bold text-white mb-3">¿Por qué está en el radar?</h3>
                  <p className="text-slate-300 leading-relaxed">{asset.summary}</p>
                  <div className="mt-4 p-4 bg-slate-800/30 rounded-xl border-l-4 border-sky-500 text-sm italic text-slate-300">
                    "{asset.radarReason}"
                  </div>
                </section>

                <section className="bg-slate-800/30 p-5 rounded-2xl border border-white/5">
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <ClipboardCheck size={16} className="text-emerald-400" />
                    Checklist antes de decidir
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {[
                      "Contrastar precio, noticia y fuente externa actualizada.",
                      "Comprobar que encaja con tu perfil y horizonte temporal.",
                      "Definir tamaño máximo de posición antes de entrar.",
                      "Identificar qué hecho invalidaría la tesis.",
                      "Evitar concentrar cartera en un solo sector o narrativa.",
                      "Revisar costes, fiscalidad y liquidez del producto real."
                    ].map(item => (
                      <div key={item} className="flex gap-2 rounded-xl bg-slate-950/40 border border-slate-800 p-3 text-slate-300">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-slate-800/40 p-6 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" /> Datos de mercado
                      {isLoadingHistory && <span className="ml-2 py-0.5 px-2 bg-slate-800 text-[9px] rounded-full text-slate-400 animate-pulse flex items-center gap-1"><Clock size={10}/> Cargando histórico...</span>}
                    </h3>
                    <div className="flex items-center gap-2">
                      {mData?.historicalStatus && (
                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded ${
                          mData.historicalStatus === 'real' ? 'bg-emerald-500/20 text-emerald-400' :
                          mData.historicalStatus === 'cache' ? 'bg-sky-500/20 text-sky-400' :
                          mData.historicalStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                          mData.historicalStatus === 'not_available' ? 'bg-slate-500/20 text-slate-400' :
                          'bg-orange-500/20 text-orange-400'
                        }`}>
                          {mData.historicalStatus === 'real' ? 'Histórico real' :
                           mData.historicalStatus === 'cache' ? 'Histórico en caché' :
                           mData.historicalStatus === 'simulated' ? 'Histórico simulado' :
                           mData.historicalStatus === 'error' ? 'Error histórico' : 'Histórico no disponible'}
                        </span>
                      )}
                      
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded ${
                          mData?.status === 'real' && !mData.fromCache ? 'bg-emerald-500/20 text-emerald-400' : 
                          mData?.status === 'real' && mData.fromCache ? 'bg-sky-500/20 text-sky-400' :
                          mData?.stale ? 'bg-amber-500/20 text-amber-400' :
                          mData?.status === 'error' ? 'bg-red-500/20 text-red-400' :
                          'bg-orange-500/20 text-orange-400'
                      }`}>
                        {mData?.status === 'real' && !mData?.fromCache ? 'Datos reales' :
                         mData?.status === 'real' && mData?.fromCache ? 'Datos en caché' :
                         mData?.stale ? 'Caché antigua' :
                         mData?.status === 'error' ? 'Error' : 'Datos simulados'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Precio</p>
                      <p className="font-mono text-lg text-white">
                        {mData?.price !== null && mData?.price !== undefined && !Number.isNaN(mData.price)
                          ? `${mData.price.toFixed(2)} ${mData.currency || 'USD'}`
                          : ((mData?.errorReason?.includes("limit") || mData?.errorReason?.includes("Límite") || mData?.fallbackReason?.includes("Límite")) 
                             ? "Dato no disponible por límite del proveedor externo"
                             : "Dato simulado/No cotizado")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Var. 1D</p>
                      {mData?.changePercent1D !== null && mData?.changePercent1D !== undefined && !Number.isNaN(mData.changePercent1D) ? (
                        <p className={`font-mono text-lg ${mData.changePercent1D >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {mData.changePercent1D > 0 ? '+' : ''}{mData.changePercent1D.toFixed(2)}%
                        </p>
                      ) : (
                        <p className="font-mono text-lg text-slate-400">Sin dato</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">Var. 1M {mData?.historicalStatus === 'cache' && <Clock size={10} className="text-sky-500" title="Dato guardado en caché"/>}{mData?.historicalStatus === 'simulated' && <Info size={10} className="text-orange-500" title="Dato simulado"/>}</p>
                      <p className={`font-mono text-lg ${mData?.oneMonthChangePercent !== null && mData?.oneMonthChangePercent !== undefined && !Number.isNaN(mData.oneMonthChangePercent) ? (mData.oneMonthChangePercent >= 0 ? 'text-emerald-400/80' : 'text-red-400/80') : 'text-slate-400'}`}>
                        {mData?.oneMonthChangePercent !== null && mData?.oneMonthChangePercent !== undefined && !Number.isNaN(mData.oneMonthChangePercent)
                          ? `${mData.oneMonthChangePercent > 0 ? '+' : ''}${mData.oneMonthChangePercent.toFixed(2)}%`
                          : "Sin histórico"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">Var. 3M {mData?.historicalStatus === 'cache' && <Clock size={10} className="text-sky-500" title="Dato guardado en caché"/>}{mData?.historicalStatus === 'simulated' && <Info size={10} className="text-orange-500" title="Dato simulado"/>}</p>
                      <p className={`font-mono text-lg ${mData?.threeMonthChangePercent !== null && mData?.threeMonthChangePercent !== undefined && !Number.isNaN(mData.threeMonthChangePercent) ? (mData.threeMonthChangePercent >= 0 ? 'text-emerald-400/80' : 'text-red-400/80') : 'text-slate-400'}`}>
                        {mData?.threeMonthChangePercent !== null && mData?.threeMonthChangePercent !== undefined && !Number.isNaN(mData.threeMonthChangePercent)
                          ? `${mData.threeMonthChangePercent > 0 ? '+' : ''}${mData.threeMonthChangePercent.toFixed(2)}%`
                          : "Sin histórico"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">Var. 1A {mData?.historicalStatus === 'cache' && <Clock size={10} className="text-sky-500" title="Dato guardado en caché"/>}{mData?.historicalStatus === 'simulated' && <Info size={10} className="text-orange-500" title="Dato simulado"/>}</p>
                      <p className={`font-mono text-lg ${mData?.oneYearChangePercent !== null && mData?.oneYearChangePercent !== undefined && !Number.isNaN(mData.oneYearChangePercent) ? (mData.oneYearChangePercent >= 0 ? 'text-emerald-400/80' : 'text-red-400/80') : 'text-slate-400'}`}>
                        {mData?.oneYearChangePercent !== null && mData?.oneYearChangePercent !== undefined && !Number.isNaN(mData.oneYearChangePercent)
                          ? `${mData.oneYearChangePercent > 0 ? '+' : ''}${mData.oneYearChangePercent.toFixed(2)}%`
                          : "Sin histórico"}
                      </p>
                    </div>
                    <div className="xl:col-span-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">Rango 52S (Máx - Mín) {mData?.historicalStatus === 'cache' && <Clock size={10} className="text-sky-500" title="Dato guardado en caché"/>}</p>
                      <p className="font-mono text-sm text-slate-400 mt-1">
                        {mData?.fiftyTwoWeekHigh !== null && mData?.fiftyTwoWeekHigh !== undefined && !Number.isNaN(mData.fiftyTwoWeekHigh) && mData?.fiftyTwoWeekLow !== null && mData?.fiftyTwoWeekLow !== undefined && !Number.isNaN(mData.fiftyTwoWeekLow)
                          ? `${mData.fiftyTwoWeekHigh.toFixed(2)} - ${mData.fiftyTwoWeekLow.toFixed(2)}`
                          : "Sin histórico"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mt-4">
                    <p className="text-xs text-indigo-300 flex items-start gap-2">
                      <Info size={14} className="mt-0.5 shrink-0" />
                      Los históricos se muestran con finalidad informativa. En esta fase no alteran el scoring.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3 pt-4 border-t border-white/5 mt-4">
                    {mData?.status === 'simulated' && (
                       <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-1">
                         <p className="text-xs text-amber-300 flex items-start gap-2">
                           <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                           {(mData?.errorReason?.includes("limit") || mData?.errorReason?.includes("Límite") || mData?.fallbackReason?.includes("Límite") || mData?.errorReason?.includes('Rate limit'))
                             ? "El activo sí cotiza, pero el proveedor gratuito ha limitado la consulta."
                             : "Dato educativo/simulado: este activo no tiene proveedor de mercado conectado de forma real."}
                         </p>
                       </div>
                    )}
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mb-2">Estado Actual</p>
                      <p className="text-[9px] text-slate-400 flex justify-between">
                         <span>Proveedor: <strong className="text-slate-300">{mData?.provider && mData.provider !== "undefined" ? mData.provider : 'Simulación interna'} {mData?.providerSymbol && mData.providerSymbol !== "undefined" && `(${mData.providerSymbol})`}</strong></span>
                         <span>Actualizado: {mData?.lastUpdated ? new Date(mData.lastUpdated).toLocaleString() : 'N/A'}</span>
                      </p>
                      {mData?.fallbackReason && mData.fallbackReason !== "undefined" && (
                        <p className="text-[9px] text-orange-400/80 mt-1">Motivo: {mData.fallbackReason}</p>
                      )}
                      {!mData?.fallbackReason && mData?.errorReason && mData.errorReason !== "undefined" && (
                        <p className="text-[9px] text-red-400/80 mt-1">Error: {mData.errorReason}</p>
                      )}
                    </div>
                    
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-sky-400 mb-2">Estado Histórico</p>
                      <p className="text-[9px] text-slate-400 flex justify-between">
                         <span>Proveedor histórico: <strong className="text-slate-300">{mData?.provider && mData.provider !== "undefined" ? mData.provider : 'Simulación interna'}</strong></span>
                         <span>Actualizado: {mData?.historicalLastUpdated ? new Date(mData.historicalLastUpdated).toLocaleString() : (mData?.lastUpdated ? new Date(mData.lastUpdated).toLocaleString() : 'N/A')}</span>
                      </p>
                      {mData?.historicalReason && (
                        <p className="text-[9px] text-sky-400/80 mt-1">
                           Motivo: {mData.historicalReason}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                       <CheckCircle2 size={16} /> Puntos a Favor
                    </h4>
                    <ul className="space-y-2">
                      {asset.pros.map((pro, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-emerald-500 mt-1">•</span> {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                       <XCircle size={16} /> Riesgos / Contras
                    </h4>
                    <ul className="space-y-2">
                      {asset.cons.map((con, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-rose-500 mt-1">•</span> {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <section className="bg-slate-800/20 p-6 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">Escenarios de Vigilancia</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-emerald-500/5 rounded-xl">
                      <h5 className="text-[10px] font-bold text-emerald-400 uppercase mb-2 flex items-center gap-1">
                        <TrendingUp size={12} /> Para salir de vigilancia y mejorar
                      </h5>
                      <ul className="text-xs text-slate-400 space-y-1">
                        {asset.improvementConditions.map((c, i) => <li key={i}>• {c}</li>)}
                      </ul>
                    </div>
                    <div className="p-4 bg-rose-500/5 rounded-xl">
                      <h5 className="text-[10px] font-bold text-rose-400 uppercase mb-2 flex items-center gap-1">
                        <TrendingDown size={12} /> Motivos para evitar o salir
                      </h5>
                      <ul className="text-xs text-slate-400 space-y-1">
                        {asset.worseningConditions.map((c, i) => <li key={i}>• {c}</li>)}
                      </ul>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Mentor Analysis Section */}
            <div className="mt-12 space-y-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <Users className="text-violet-400" /> Opinión de los Mentores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {asset.mentorScores.map(score => {
                  const mentor = mentors.find(m => m.id === score.mentorId)!;
                  return <MentorScoreCard key={score.mentorId} mentorScore={score} mentor={mentor} />;
                })}
              </div>
            </div>

            {/* Simulated Knowledge Rules Section */}
            <div className="mt-12 space-y-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <Lightbulb className="text-amber-400" /> Reglas de conocimiento relacionadas
              </h3>
              <p className="text-slate-400 text-sm">Reglas educativas generales relacionadas con este activo. No son recomendación de compra.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Agrupar por mentor */}
                {['andrea', 'pablo'].map(mentorId => {
                  const mentorRules = relevantRules.filter(r => r.rule.mentorId === mentorId);
                  if (mentorRules.length === 0) return null;
                  return (
                    <div key={mentorId} className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2 mb-3">
                         {mentorId === 'andrea' ? 'Andrea Redondo / Club Inversión' : 'Pablo Gil'}
                      </h4>
                      <div className="space-y-4">
                        {mentorRules.map(matchedRule => (
                          <div key={matchedRule.rule.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:border-purple-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-2 py-1 rounded">
                                {matchedRule.rule.category}
                              </span>
                            </div>
                            <h5 className="font-medium text-slate-200 text-sm mb-1">{matchedRule.rule.rule}</h5>
                            <p className="text-xs text-slate-400 mb-2 line-clamp-3">{matchedRule.rule.explanation}</p>
                            <div className="pt-2 border-t border-slate-700/50">
                              <p className="text-[10px] text-slate-500 italic">
                                Motivo: {matchedRule.matchReason}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulated News Section */}
            {asset.news.length > 0 && (
              <div className="mt-12 space-y-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Newspaper className="text-sky-400" /> Noticias de Seguimiento (Simuladas)
                </h3>
                <div className="space-y-4">
                  {asset.news.map((n, i) => (
                    <div key={i} className="p-5 bg-slate-800/40 rounded-2xl border border-white/5 flex gap-4">
                      <div className={`w-1 h-12 rounded-full flex-shrink-0 ${n.impact === 'positivo' ? 'bg-emerald-500' : n.impact === 'negativo' ? 'bg-rose-500' : 'bg-slate-500'}`} />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-slate-500 font-mono uppercase">{n.date}</span>
                          <Badge variant="neutral" className="text-[9px]">{n.source}</Badge>
                        </div>
                        <h4 className="font-bold text-white text-md">{n.title}</h4>
                        <p className="text-sm text-slate-400 mt-1">{n.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer / Footer Disclaimer */}
            <div className="mt-12 pt-8 border-t border-white/5 text-center px-12">
              <p className="text-xs text-slate-500 leading-relaxed italic">
                Esta es una herramienta educativa y visual. Los datos mostrados son simulaciones y no constituyen asesoramiento financiero real. 
                Utiliza este radar para orientar tu estudio personal y nunca como una señal de compra directa. Invertir conlleva riesgo de pérdida de capital.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
