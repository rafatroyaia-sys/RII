import React, { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Briefcase, ClipboardCheck, Copy, Download, Radar, Route, UserCheck } from "lucide-react";
import { ProcessedAsset, RiskLevel } from "../../types";
import { OpportunityCandidate } from "../../logic/opportunityRadar";

interface FinancialPlanPanelProps {
  assets: ProcessedAsset[];
  opportunityCandidates: OpportunityCandidate[];
  userProfile: { score: number; name: string } | null;
  onGoProfile: () => void;
  onGoPortfolio: () => void;
  onGoRadar: () => void;
  onGoEducation: () => void;
}

interface StoredHolding {
  ticker: string;
  amount: number;
  monthlyContribution: number;
  targetWeight?: number;
}

const PORTFOLIO_STORAGE_KEY = "rii_local_portfolio_v1";

function formatEuro(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function riskLabel(risk?: RiskLevel) {
  if (!risk) return "Sin dato";
  return risk;
}

function readStoredHoldings(): StoredHolding[] {
  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.ticker)
      .map((item) => ({
        ticker: String(item.ticker).toUpperCase(),
        amount: Number(item.amount) || 0,
        monthlyContribution: Number(item.monthlyContribution) || 0,
        targetWeight: Number(item.targetWeight) || undefined,
      }));
  } catch {
    return [];
  }
}

export const FinancialPlanPanel: React.FC<FinancialPlanPanelProps> = ({
  assets,
  opportunityCandidates,
  userProfile,
  onGoProfile,
  onGoPortfolio,
  onGoRadar,
  onGoEducation,
}) => {
  const [holdings, setHoldings] = useState<StoredHolding[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const refresh = () => setHoldings(readStoredHoldings());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const assetByTicker = useMemo(
    () => new Map(assets.map((asset) => [asset.ticker.toUpperCase(), asset])),
    [assets]
  );

  const plan = useMemo(() => {
    const totalAmount = holdings.reduce((sum, holding) => sum + holding.amount, 0);
    const totalMonthly = holdings.reduce((sum, holding) => sum + holding.monthlyContribution, 0);
    const highRiskAmount = holdings.reduce((sum, holding) => {
      const risk = assetByTicker.get(holding.ticker)?.riskLevel;
      return risk === RiskLevel.Alto || risk === RiskLevel.Extremo ? sum + holding.amount : sum;
    }, 0);
    const coreAmount = holdings.reduce((sum, holding) => {
      const asset = assetByTicker.get(holding.ticker);
      return asset?.type === "ETF" || asset?.type === "Defensivo" ? sum + holding.amount : sum;
    }, 0);

    const watchlist = opportunityCandidates.slice(0, 5).map((candidate) => candidate.asset);
    const matchedHoldings = holdings
      .map((holding) => ({
        ...holding,
        asset: assetByTicker.get(holding.ticker),
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalAmount,
      totalMonthly,
      corePct: totalAmount > 0 ? (coreAmount / totalAmount) * 100 : 0,
      highRiskPct: totalAmount > 0 ? (highRiskAmount / totalAmount) * 100 : 0,
      watchlist,
      matchedHoldings,
    };
  }, [assetByTicker, holdings, opportunityCandidates]);

  const report = useMemo(() => {
    const lines = [
      "# Plan educativo Radar Inteligente",
      "",
      `Fecha: ${new Date().toLocaleDateString("es-ES")}`,
      "",
      "## Perfil",
      userProfile
        ? `Perfil registrado: ${userProfile.name} (${userProfile.score}/100).`
        : "Perfil pendiente: completar el test antes de interpretar riesgos.",
      "",
      "## Cartera local",
      `Valor registrado: ${formatEuro(plan.totalAmount)}.`,
      `Aportacion mensual: ${formatEuro(plan.totalMonthly)}.`,
      `Base ETF/defensiva: ${plan.corePct.toFixed(0)}%.`,
      `Riesgo alto/extremo: ${plan.highRiskPct.toFixed(0)}%.`,
      ...(plan.matchedHoldings.length
        ? plan.matchedHoldings.slice(0, 8).map((holding) => {
            const asset = holding.asset;
            return `- ${holding.ticker}: ${formatEuro(holding.amount)} | ${asset?.type || "manual"} | riesgo ${riskLabel(asset?.riskLevel)}.`;
          })
        : ["- Cartera vacia: registrar activos para obtener lectura."]),
      "",
      "## Watchlist educativa",
      ...plan.watchlist.map((asset, index) => (
        `${index + 1}. ${asset.ticker} - ${asset.name}: score ${asset.opportunityScore}/100, riesgo ${asset.riskLevel}, horizonte ${asset.recommendedHorizon}.`
      )),
      "",
      "## Rutina semanal sugerida",
      "- Revisar si ha cambiado el dato macro o el estado de proveedor.",
      "- Leer ficha de 1 activo del radar, sin comprar por impulso.",
      "- Comprobar concentracion y aportaciones de la cartera local.",
      "- Escribir una condicion que invalidaria cada tesis vigilada.",
      "",
      "Nota: documento educativo. No constituye asesoramiento financiero.",
    ];
    return lines.join("\n");
  }, [plan, userProfile]);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const downloadReport = () => {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plan-educativo-radar.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  const steps = [
    {
      icon: <UserCheck size={18} />,
      title: "1. Perfil",
      status: userProfile ? userProfile.name : "Pendiente",
      detail: userProfile ? `Riesgo emocional ${userProfile.score}/100.` : "Completa el test para personalizar lectura.",
      action: "Abrir perfil",
      onClick: onGoProfile,
    },
    {
      icon: <Briefcase size={18} />,
      title: "2. Cartera",
      status: holdings.length ? `${holdings.length} activos` : "Vacia",
      detail: `${formatEuro(plan.totalAmount)} registrados; base ETF/defensiva ${plan.corePct.toFixed(0)}%.`,
      action: "Abrir cartera",
      onClick: onGoPortfolio,
    },
    {
      icon: <Radar size={18} />,
      title: "3. Watchlist",
      status: `${plan.watchlist.length} ideas`,
      detail: plan.watchlist[0] ? `Primera idea: ${plan.watchlist[0].ticker}.` : "Sin candidatos suficientes.",
      action: "Abrir radar",
      onClick: onGoRadar,
    },
    {
      icon: <BookOpenCheck size={18} />,
      title: "4. Disciplina",
      status: "Rutina semanal",
      detail: "Fichas, tesis invalidada, concentracion y datos macro.",
      action: "Abrir formacion",
      onClick: onGoEducation,
    },
  ];

  return (
    <section className="rounded-2xl border border-emerald-500/20 bg-slate-900 p-5 sm:p-6 shadow-xl shadow-emerald-950/10">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-400">
            <Route size={20} />
            <h2 className="text-lg font-extrabold text-white">Plan de estudio financiero</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            Una hoja de ruta privada que cruza perfil, cartera local, radar y rutina. Convierte la app en proceso, no solo en ranking.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyReport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-bold text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300"
          >
            {copied ? <ClipboardCheck size={14} /> : <Copy size={14} />}
            {copied ? "Copiado" : "Copiar informe"}
          </button>
          <button
            onClick={downloadReport}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            <Download size={14} />
            Descargar .md
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <article key={step.title} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-emerald-400">
              {step.icon}
              <h3 className="font-bold text-slate-100">{step.title}</h3>
            </div>
            <p className="text-sm font-bold text-white">{step.status}</p>
            <p className="mt-1 min-h-[38px] text-xs leading-relaxed text-slate-400">{step.detail}</p>
            <button
              onClick={step.onClick}
              className="mt-4 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300"
            >
              {step.action}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};
