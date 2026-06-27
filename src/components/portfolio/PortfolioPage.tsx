import React, { useEffect, useMemo, useState } from "react";
import { ProcessedAsset, AssetType, RiskLevel } from "../../types";
import { Badge } from "../ui/Badge";
import { Briefcase, Plus, Trash2, ShieldCheck, AlertTriangle, Download, Upload, Sparkles, Target, TrendingUp, Activity } from "lucide-react";

interface PortfolioHolding {
  id: string;
  ticker: string;
  amount: number;
  monthlyContribution: number;
  targetWeight?: number;
}

interface PortfolioPageProps {
  assets: ProcessedAsset[];
  onSelectAsset: (asset: ProcessedAsset) => void;
  userProfile?: { score: number; name: string } | null;
}

const STORAGE_KEY = "rii_local_portfolio_v1";

interface PortfolioTemplateHolding {
  ticker: string;
  targetWeight: number;
}

interface PortfolioTemplate {
  name: string;
  description: string;
  holdings: PortfolioTemplateHolding[];
}

const PORTFOLIO_TEMPLATES: PortfolioTemplate[] = [
  {
    name: "Indexada prudente",
    description: "Base global, liquidez y bonos cortos.",
    holdings: [
      { ticker: "VWCE", targetWeight: 55 },
      { ticker: "XEON", targetWeight: 25 },
      { ticker: "AGGG", targetWeight: 20 },
    ],
  },
  {
    name: "Crecimiento controlado",
    description: "Nucleo ETF con satelites tecnologicos.",
    holdings: [
      { ticker: "VWCE", targetWeight: 50 },
      { ticker: "CSPX", targetWeight: 20 },
      { ticker: "SMH", targetWeight: 15 },
      { ticker: "CYBR", targetWeight: 10 },
      { ticker: "XEON", targetWeight: 5 },
    ],
  },
  {
    name: "Radar satelite",
    description: "Cartera para estudiar ideas sin concentrar demasiado.",
    holdings: [
      { ticker: "VWCE", targetWeight: 45 },
      { ticker: "MSFT", targetWeight: 10 },
      { ticker: "ASML", targetWeight: 10 },
      { ticker: "NVDA", targetWeight: 8 },
      { ticker: "NOVO-B", targetWeight: 7 },
      { ticker: "XEON", targetWeight: 20 },
    ],
  },
];

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function riskVariant(risk?: RiskLevel) {
  if (risk === RiskLevel.Bajo) return "success";
  if (risk === RiskLevel.Medio) return "warning";
  if (risk === RiskLevel.Alto || risk === RiskLevel.Extremo) return "error";
  return "neutral";
}

function profileTargets(score?: number | null) {
  if (score === undefined || score === null) {
    return {
      coreMin: 60,
      coreMax: 85,
      highRiskMax: 15,
      topWeightMax: 25,
      label: "Completa el perfil para afinar estos rangos",
    };
  }
  if (score <= 20) return { coreMin: 85, coreMax: 100, highRiskMax: 5, topWeightMax: 20, label: "Muy conservador" };
  if (score <= 40) return { coreMin: 75, coreMax: 95, highRiskMax: 10, topWeightMax: 22, label: "Conservador" };
  if (score <= 60) return { coreMin: 60, coreMax: 85, highRiskMax: 20, topWeightMax: 28, label: "Moderado" };
  if (score <= 80) return { coreMin: 50, coreMax: 75, highRiskMax: 30, topWeightMax: 32, label: "Dinamico" };
  return { coreMin: 40, coreMax: 70, highRiskMax: 40, topWeightMax: 35, label: "Agresivo" };
}

function statusTone(ok: boolean, warning = false) {
  if (ok) return "border-emerald-500/25 bg-emerald-500/5 text-emerald-300";
  if (warning) return "border-amber-500/25 bg-amber-500/5 text-amber-300";
  return "border-rose-500/25 bg-rose-500/5 text-rose-300";
}

function riskDrawdown(risk: RiskLevel | undefined, scenario: "normal" | "crisis" | "extreme") {
  if (risk === RiskLevel.Bajo) return scenario === "normal" ? -3 : scenario === "crisis" ? -8 : -15;
  if (risk === RiskLevel.Medio) return scenario === "normal" ? -8 : scenario === "crisis" ? -18 : -30;
  if (risk === RiskLevel.Alto) return scenario === "normal" ? -15 : scenario === "crisis" ? -35 : -55;
  if (risk === RiskLevel.Extremo) return scenario === "normal" ? -25 : scenario === "crisis" ? -55 : -75;
  return scenario === "normal" ? -8 : scenario === "crisis" ? -20 : -35;
}

function toleratedDrawdown(score?: number | null) {
  if (score === undefined || score === null) return 15;
  if (score <= 20) return 5;
  if (score <= 40) return 10;
  if (score <= 60) return 20;
  if (score <= 80) return 35;
  return 50;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ assets, onSelectAsset, userProfile }) => {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [ticker, setTicker] = useState("");
  const [amount, setAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [targetWeight, setTargetWeight] = useState("");

  const assetByTicker = useMemo(() => {
    return new Map(assets.map((asset) => [asset.ticker.toUpperCase(), asset]));
  }, [assets]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHoldings(JSON.parse(raw));
    } catch {
      setHoldings([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings]);

  const enrichedHoldings = useMemo(() => {
    return holdings.map((holding) => ({
      ...holding,
      asset: assetByTicker.get(holding.ticker.toUpperCase()),
    }));
  }, [holdings, assetByTicker]);

  const totals = useMemo(() => {
    const totalAmount = enrichedHoldings.reduce((sum, holding) => sum + (holding.amount || 0), 0);
    const totalMonthly = enrichedHoldings.reduce((sum, holding) => sum + (holding.monthlyContribution || 0), 0);
    const highRiskAmount = enrichedHoldings.reduce((sum, holding) => {
      const risk = holding.asset?.riskLevel;
      return risk === RiskLevel.Alto || risk === RiskLevel.Extremo ? sum + holding.amount : sum;
    }, 0);
    const coreAmount = enrichedHoldings.reduce((sum, holding) => {
      const type = holding.asset?.type;
      return type === AssetType.ETF || type === AssetType.Defensivo ? sum + holding.amount : sum;
    }, 0);
    const topWeight = totalAmount > 0
      ? Math.max(...enrichedHoldings.map((holding) => ((holding.amount || 0) / totalAmount) * 100), 0)
      : 0;
    const targetPct = enrichedHoldings.reduce((sum, holding) => sum + (holding.targetWeight || 0), 0);
    const largestDrift = totalAmount > 0
      ? Math.max(
          ...enrichedHoldings.map((holding) => {
            if (!holding.targetWeight) return 0;
            const currentWeight = ((holding.amount || 0) / totalAmount) * 100;
            return Math.abs(currentWeight - holding.targetWeight);
          }),
          0
        )
      : 0;

    return {
      totalAmount,
      totalMonthly,
      highRiskPct: totalAmount > 0 ? (highRiskAmount / totalAmount) * 100 : 0,
      corePct: totalAmount > 0 ? (coreAmount / totalAmount) * 100 : 0,
      topWeight,
      targetPct,
      largestDrift,
    };
  }, [enrichedHoldings]);

  const insights = useMemo(() => {
    if (!holdings.length) {
      return [
        "Añade tus activos para ver concentración, riesgo y encaje con el radar.",
        "Los datos se guardan solo en este navegador.",
      ];
    }

    const result: string[] = [];
    if (totals.corePct < 50) result.push("La parte núcleo (ETF/defensivos) parece baja. Revisa si la cartera depende demasiado de apuestas individuales.");
    else result.push("La cartera tiene una base núcleo razonable según los activos registrados.");

    if (totals.highRiskPct > 35) result.push("La exposición a activos de riesgo alto/extremo es elevada. Vigila que encaje con tu perfil emocional.");
    else result.push("La exposición a activos de riesgo alto/extremo parece contenida.");

    if (totals.topWeight > 35) result.push("Hay un activo con mucho peso relativo. Comprueba que esa concentración sea intencionada.");
    else result.push("La concentración por activo no parece excesiva con los importes actuales.");

    if (totals.targetPct > 0) {
      if (Math.abs(totals.targetPct - 100) > 1) {
        result.push(`Los pesos objetivo suman ${totals.targetPct.toFixed(0)}%. Para usar el rebalanceo como mapa, intenta que sumen 100%.`);
      } else if (totals.largestDrift > 7) {
        result.push("Hay desviaciones relevantes frente a tus pesos objetivo. Revisa si las nuevas aportaciones pueden corregirlas poco a poco.");
      } else {
        result.push("La cartera registrada está bastante cerca de los pesos objetivo que has marcado.");
      }
    }

    return result;
  }, [holdings.length, totals]);

  const targets = useMemo(() => profileTargets(userProfile?.score), [userProfile?.score]);

  const personalizedPortfolioActions = useMemo(() => {
    const actions: string[] = [];

    if (!holdings.length) {
      return [
        "Registra tu cartera o aplica una plantilla para recibir un diagnostico real.",
        "Empieza por separar nucleo estable y satelites de oportunidad.",
      ];
    }

    if (totals.corePct < targets.coreMin) {
      actions.push(`Refuerza el nucleo: tu base ETF/defensiva esta en ${totals.corePct.toFixed(0)}% y para este perfil se sugiere ${targets.coreMin}-${targets.coreMax}%.`);
    } else if (totals.corePct > targets.coreMax) {
      actions.push("La cartera es muy defensiva para tu perfil. Puede ser correcto, pero revisa si limita demasiado el crecimiento esperado.");
    } else {
      actions.push("El peso de nucleo ETF/defensivo encaja razonablemente con tu perfil.");
    }

    if (totals.highRiskPct > targets.highRiskMax) {
      actions.push(`Reduce o limita nuevas aportaciones a riesgo alto: estas en ${totals.highRiskPct.toFixed(0)}% y el maximo orientativo es ${targets.highRiskMax}%.`);
    } else {
      actions.push("La exposicion a riesgo alto/extremo esta dentro del rango educativo para tu perfil.");
    }

    if (totals.topWeight > targets.topWeightMax) {
      actions.push(`Hay concentracion: tu mayor posicion pesa ${totals.topWeight.toFixed(0)}%. Antes de aumentar, exige una tesis muy clara.`);
    } else {
      actions.push("La concentracion por activo no supera el umbral educativo de tu perfil.");
    }

    if (totals.totalMonthly > 0) {
      actions.push("Usa aportaciones mensuales para corregir desviaciones antes que vender por impulso.");
    }

    return actions;
  }, [holdings.length, targets, totals]);

  const stressScenarios = useMemo(() => {
    const scenarios = [
      { id: "normal" as const, name: "Correccion normal", description: "Caida incomoda pero frecuente en mercados." },
      { id: "crisis" as const, name: "Crisis fuerte", description: "Mercado bajista con volatilidad elevada." },
      { id: "extreme" as const, name: "Escenario extremo", description: "Shock severo; no es prediccion, es prueba de aguante." },
    ];

    return scenarios.map((scenario) => {
      const lossAmount = enrichedHoldings.reduce((sum, holding) => {
        const drawdown = riskDrawdown(holding.asset?.riskLevel, scenario.id);
        return sum + holding.amount * Math.abs(drawdown / 100);
      }, 0);
      const lossPct = totals.totalAmount > 0 ? (lossAmount / totals.totalAmount) * 100 : 0;
      const monthsToRecover = totals.totalMonthly > 0 ? Math.ceil(lossAmount / totals.totalMonthly) : null;
      const tolerated = toleratedDrawdown(userProfile?.score);

      return {
        ...scenario,
        lossAmount,
        lossPct,
        monthsToRecover,
        tolerated,
        withinProfile: lossPct <= tolerated,
      };
    });
  }, [enrichedHoldings, totals.totalAmount, totals.totalMonthly, userProfile?.score]);

  const addHolding = () => {
    const cleanTicker = ticker.trim().toUpperCase();
    if (!cleanTicker) return;

    const existing = holdings.find((holding) => holding.ticker.toUpperCase() === cleanTicker);
    const parsedAmount = Number(amount) || 0;
    const parsedMonthly = Number(monthlyContribution) || 0;
    const parsedTarget = Number(targetWeight) || 0;

    if (existing) {
      setHoldings((current) => current.map((holding) => (
        holding.id === existing.id
          ? {
              ...holding,
              amount: holding.amount + parsedAmount,
              monthlyContribution: holding.monthlyContribution + parsedMonthly,
              targetWeight: parsedTarget > 0 ? parsedTarget : holding.targetWeight,
            }
          : holding
      )));
    } else {
      setHoldings((current) => [
        ...current,
        { id: makeId(), ticker: cleanTicker, amount: parsedAmount, monthlyContribution: parsedMonthly, targetWeight: parsedTarget || undefined },
      ]);
    }

    setTicker("");
    setAmount("");
    setMonthlyContribution("");
    setTargetWeight("");
  };

  const removeHolding = (id: string) => {
    setHoldings((current) => current.filter((holding) => holding.id !== id));
  };

  const exportPortfolio = () => {
    const blob = new Blob([JSON.stringify(holdings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mi-cartera-radar.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importPortfolio = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as PortfolioHolding[];
      if (Array.isArray(parsed)) {
        setHoldings(parsed.filter((holding) => holding.ticker).map((holding) => ({
          ...holding,
          amount: Number(holding.amount) || 0,
          monthlyContribution: Number(holding.monthlyContribution) || 0,
          targetWeight: Number(holding.targetWeight) || undefined,
        })));
      }
    } catch {
      // Keep current portfolio if import fails.
    } finally {
      event.target.value = "";
    }
  };

  const applyTemplate = (template: PortfolioTemplate) => {
    setHoldings((current) => {
      const byTicker = new Map<string, PortfolioHolding>(
        current.map((holding) => [holding.ticker.toUpperCase(), holding])
      );
      template.holdings.forEach((item) => {
        const key = item.ticker.toUpperCase();
        const existing = byTicker.get(key);
        byTicker.set(key, {
          id: existing?.id || makeId(),
          ticker: key,
          amount: existing?.amount || 0,
          monthlyContribution: existing?.monthlyContribution || 0,
          targetWeight: item.targetWeight,
        });
      });
      return Array.from(byTicker.values());
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Briefcase className="text-emerald-400" />
              Mi cartera
            </h2>
            <p className="text-slate-400 mt-2 max-w-3xl">
              Cartera privada de este navegador. No se publica, no se sube a Netlify y no se comparte con otros usuarios.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportPortfolio}
              disabled={!holdings.length}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-sm font-semibold disabled:opacity-40"
            >
              <Download size={16} />
              Exportar
            </button>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-sm font-semibold cursor-pointer">
              <Upload size={16} />
              Importar
              <input type="file" accept="application/json" onChange={importPortfolio} className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Valor registrado</p>
            <p className="text-xl font-bold text-white mt-1">{formatEuro(totals.totalAmount)}</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Aportación mensual</p>
            <p className="text-xl font-bold text-white mt-1">{formatEuro(totals.totalMonthly)}</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Núcleo ETF/defensivo</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{totals.corePct.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Riesgo alto/extremo</p>
            <p className="text-xl font-bold text-amber-400 mt-1">{totals.highRiskPct.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Objetivos marcados</p>
            <p className={`text-xl font-bold mt-1 ${Math.abs(totals.targetPct - 100) <= 1 ? "text-emerald-400" : "text-sky-400"}`}>
              {totals.targetPct.toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sky-400">
                <Target size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Diagnostico personalizado de cartera</h3>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {userProfile
                  ? `Rangos educativos calculados para perfil ${userProfile.name} (${userProfile.score}/100).`
                  : "Sin perfil guardado: se usan rangos prudentes hasta completar el test."}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs text-slate-300">
              Perfil base: <strong className="text-white">{targets.label}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className={`rounded-xl border p-4 ${statusTone(totals.corePct >= targets.coreMin && totals.corePct <= targets.coreMax, totals.corePct < targets.coreMin)}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Nucleo ETF/defensivo</p>
              <p className="mt-1 text-2xl font-extrabold text-white">{totals.corePct.toFixed(0)}%</p>
              <p className="mt-1 text-xs">Objetivo educativo: {targets.coreMin}-{targets.coreMax}%</p>
            </div>
            <div className={`rounded-xl border p-4 ${statusTone(totals.highRiskPct <= targets.highRiskMax, totals.highRiskPct <= targets.highRiskMax + 10)}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Riesgo alto/extremo</p>
              <p className="mt-1 text-2xl font-extrabold text-white">{totals.highRiskPct.toFixed(0)}%</p>
              <p className="mt-1 text-xs">Maximo orientativo: {targets.highRiskMax}%</p>
            </div>
            <div className={`rounded-xl border p-4 ${statusTone(totals.topWeight <= targets.topWeightMax, totals.topWeight <= targets.topWeightMax + 8)}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Mayor posicion</p>
              <p className="mt-1 text-2xl font-extrabold text-white">{totals.topWeight.toFixed(0)}%</p>
              <p className="mt-1 text-xs">Umbral de concentracion: {targets.topWeightMax}%</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {personalizedPortfolioActions.map((action, index) => (
              <div key={action} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                {index === 0 ? <TrendingUp size={16} className="mt-0.5 text-emerald-400" /> : <ShieldCheck size={16} className="mt-0.5 text-sky-400" />}
                <p className="text-xs leading-relaxed text-slate-300">{action}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-400">
                <Activity size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Test de estres de cartera</h3>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Traduce el riesgo a euros. No predice el futuro: ayuda a saber si podrias soportar una caida antes de vivirla.
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs text-slate-300">
              Caida tolerable estimada: <strong className="text-white">{toleratedDrawdown(userProfile?.score)}%</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {stressScenarios.map((scenario) => (
              <article
                key={scenario.id}
                className={`rounded-xl border p-4 ${statusTone(scenario.withinProfile, scenario.lossPct <= scenario.tolerated + 10)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white">{scenario.name}</h4>
                    <p className="mt-1 text-xs leading-relaxed opacity-85">{scenario.description}</p>
                  </div>
                  {scenario.withinProfile ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Caida estimada</p>
                    <p className="text-xl font-extrabold text-white">-{scenario.lossPct.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Impacto</p>
                    <p className="text-xl font-extrabold text-white">-{formatEuro(scenario.lossAmount)}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed">
                  {scenario.monthsToRecover
                    ? `Con tu aportacion mensual actual, equivaldria a unos ${scenario.monthsToRecover} meses de aportaciones.`
                    : "Registra aportacion mensual para estimar cuanto esfuerzo de ahorro representa."}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="mb-6 bg-slate-950/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200">Plantillas de pesos objetivo</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PORTFOLIO_TEMPLATES.map((template) => (
              <button
                key={template.name}
                onClick={() => applyTemplate(template)}
                className="text-left rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors"
              >
                <span className="block text-sm font-bold text-white">{template.name}</span>
                <span className="block text-[11px] text-slate-500 mt-1">{template.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto_auto] gap-3 mb-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Activo</label>
            <input
              list="portfolio-assets"
              value={ticker}
              onChange={(event) => setTicker(event.target.value)}
              placeholder="Ej. VWCE, IWDA, ADYEN..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
            <datalist id="portfolio-assets">
              {assets.map((asset) => (
                <option key={asset.id} value={asset.ticker}>{asset.name}</option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Importe</label>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="w-full lg:w-32 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Mensual</label>
            <input
              value={monthlyContribution}
              onChange={(event) => setMonthlyContribution(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="w-full lg:w-32 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Objetivo %</label>
            <input
              value={targetWeight}
              onChange={(event) => setTargetWeight(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="w-full lg:w-28 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={addHolding}
            className="self-end inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors"
          >
            <Plus size={16} />
            Añadir
          </button>
        </div>

        {enrichedHoldings.length === 0 ? (
          <div className="border border-dashed border-slate-700 rounded-xl px-4 py-8 text-center text-slate-500">
            Tu cartera local está vacía.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-slate-950/60 text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Activo</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Riesgo</th>
                  <th className="px-4 py-3 text-right">Peso</th>
                  <th className="px-4 py-3 text-right">Objetivo</th>
                  <th className="px-4 py-3 text-right">Ajuste</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  <th className="px-4 py-3 text-right">Mensual</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {enrichedHoldings.map((holding) => {
                const weight = totals.totalAmount > 0 ? (holding.amount / totals.totalAmount) * 100 : 0;
                const target = holding.targetWeight || 0;
                const targetAmount = target > 0 ? (totals.totalAmount * target) / 100 : 0;
                const driftAmount = target > 0 ? targetAmount - holding.amount : 0;
                return (
                  <tr key={holding.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => holding.asset && onSelectAsset(holding.asset)}
                        className="text-left"
                      >
                        <span className="block text-white font-bold">{holding.ticker}</span>
                        <span className="block text-[10px] text-slate-500">{holding.asset?.name || "Activo no encontrado en el radar"}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">{holding.asset?.type || "Manual"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={riskVariant(holding.asset?.riskLevel)}>{holding.asset?.riskLevel || "Sin dato"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">{weight.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-slate-300">{target ? `${target.toFixed(1)}%` : "-"}</td>
                    <td className={`px-4 py-3 text-right font-mono ${driftAmount > 0 ? "text-emerald-400" : driftAmount < 0 ? "text-amber-400" : "text-slate-500"}`}>
                      {target ? `${driftAmount > 0 ? "+" : ""}${formatEuro(driftAmount)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{formatEuro(holding.amount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{formatEuro(holding.monthlyContribution)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeHolding(holding.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Eliminar activo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {insights.map((insight, index) => (
          <div key={index} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              {index === 0 ? <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />}
              <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
