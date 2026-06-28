import React, { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, BookOpenCheck, Briefcase, ClipboardCheck, Copy, Download, Gauge, Radar, Route, UserCheck } from "lucide-react";
import { MacroIndicator, ProcessedAsset, RiskLevel } from "../../types";
import { OpportunityCandidate } from "../../logic/opportunityRadar";

interface FinancialPlanPanelProps {
  assets: ProcessedAsset[];
  opportunityCandidates: OpportunityCandidate[];
  macroIndicators: MacroIndicator[];
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

interface ProfileAnswer {
  topic: string;
  question: string;
  answer: string;
  points: number;
}

interface StoredProfile {
  score: number;
  date: string;
  answers?: ProfileAnswer[];
}

const PORTFOLIO_STORAGE_KEY = "rii_local_portfolio_v1";
const PROFILE_STORAGE_KEY = "investor_profile_score";

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

function readStoredProfile(): StoredProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredProfile;
    if (typeof parsed?.score !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function answerFor(profile: StoredProfile | null, topic: string) {
  return profile?.answers?.find((answer) => answer.topic === topic)?.answer || null;
}

function allocationGuide(score: number | null) {
  if (score === null) {
    return { equity: "Pendiente", core: "Completar perfil", satellite: "0-10%", maxHighRisk: "Pendiente" };
  }
  if (score <= 20) return { equity: "0-20%", core: "80-100%", satellite: "0-5%", maxHighRisk: "0-5%" };
  if (score <= 40) return { equity: "20-40%", core: "70-90%", satellite: "0-10%", maxHighRisk: "5-10%" };
  if (score <= 60) return { equity: "40-65%", core: "60-80%", satellite: "5-15%", maxHighRisk: "10-20%" };
  if (score <= 80) return { equity: "65-85%", core: "50-70%", satellite: "10-25%", maxHighRisk: "20-30%" };
  return { equity: "80-100%", core: "40-60%", satellite: "15-35%", maxHighRisk: "30-40%" };
}

function macroValue(indicators: MacroIndicator[], id: string) {
  return indicators.find((indicator) => indicator.id === id)?.value ?? null;
}

function buildMacroReading(indicators: MacroIndicator[]) {
  const fed = macroValue(indicators, "FEDFUNDS");
  const cpi = macroValue(indicators, "CPI_YOY");
  const curve = macroValue(indicators, "YIELD_CURVE_10Y2Y");
  const unrate = macroValue(indicators, "UNRATE");
  const us10y = macroValue(indicators, "GS10");
  const cautions = [
    fed !== null && fed >= 5 ? "Tipos Fed altos: conviene exigir margen de seguridad y evitar euforia en growth caro." : null,
    cpi !== null && cpi >= 4 ? "Inflacion todavia alta: puede retrasar bajadas de tipos y presionar activos de duracion." : null,
    us10y !== null && us10y >= 4.5 ? "Bono US 10Y exigente: las valoraciones elevadas tienen menos perdon." : null,
    curve !== null && curve < -0.5 ? "Curva 10Y-2Y invertida: vigilar riesgo de desaceleracion y beneficios empresariales." : null,
    unrate !== null && unrate >= 5 ? "Paro deteriorandose: vigilar riesgo de ciclo y beneficios empresariales." : null,
  ].filter(Boolean) as string[];

  return {
    label: cautions.length >= 2 ? "Cautela macro" : cautions.length === 1 ? "Entorno mixto" : "Sin alarma macro clara",
    notes: cautions.length ? cautions : [
      "No hay senales macro extremas en los indicadores cargados; aun asi, la decision debe depender del activo, precio y horizonte.",
    ],
    raw: {
      fed,
      cpi,
      curve,
      unrate,
      us10y,
    },
  };
}

export const FinancialPlanPanel: React.FC<FinancialPlanPanelProps> = ({
  assets,
  opportunityCandidates,
  macroIndicators,
  userProfile,
  onGoProfile,
  onGoPortfolio,
  onGoRadar,
  onGoEducation,
}) => {
  const [holdings, setHoldings] = useState<StoredHolding[]>([]);
  const [profileDetails, setProfileDetails] = useState<StoredProfile | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setHoldings(readStoredHoldings());
      setProfileDetails(readStoredProfile());
    };
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
  const candidateByTicker = useMemo(
    () => new Map(opportunityCandidates.map((candidate) => [candidate.asset.ticker.toUpperCase(), candidate])),
    [opportunityCandidates]
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
      macro: buildMacroReading(macroIndicators),
    };
  }, [assetByTicker, holdings, macroIndicators, opportunityCandidates]);

  const score = userProfile?.score ?? profileDetails?.score ?? null;
  const guide = allocationGuide(score);
  const ageAnswer = answerFor(profileDetails, "age");
  const horizonAnswer = answerFor(profileDetails, "horizon");
  const incomeAnswer = answerFor(profileDetails, "incomeStability");
  const emergencyAnswer = answerFor(profileDetails, "emergencyFund");

  const personalizedAdvice = useMemo(() => {
    const items: string[] = [];
    if (score === null) {
      items.push("Completa el perfil para convertir este plan en una guia personalizada.");
    } else if (score <= 40) {
      items.push("Prioridad: proteger capital, evitar concentracion y usar aportaciones graduales.");
    } else if (score <= 60) {
      items.push("Prioridad: equilibrio. Base diversificada primero; acciones individuales como complemento pequeno.");
    } else {
      items.push("Prioridad: crecimiento con control. Puedes estudiar mas riesgo, pero con limites de peso y tesis invalidada.");
    }

    if (plan.totalMonthly > 0) {
      items.push(`Aportacion mensual detectada: ${formatEuro(plan.totalMonthly)}. Usala para rebalancear antes que hacer cambios bruscos.`);
    } else {
      items.push("Sin aportacion mensual registrada: el plan sera mas estable si defines una cantidad periodica realista.");
    }

    if (plan.highRiskPct > 0 && score !== null) {
      const highRiskWarning = score <= 40 && plan.highRiskPct > 10
        ? "La exposicion a riesgo alto parece elevada para tu perfil."
        : score <= 60 && plan.highRiskPct > 20
          ? "La exposicion a riesgo alto empieza a ser relevante para un perfil moderado."
          : null;
      if (highRiskWarning) items.push(highRiskWarning);
    }

    if (emergencyAnswer && emergencyAnswer.toLowerCase().includes("no tengo")) {
      items.push("Antes de invertir agresivamente, crea fondo de emergencia: evita vender inversiones en mal momento.");
    }

    const ageText = (ageAnswer || "").toLowerCase();
    if (ageText.includes("mas de 60") || ageText.includes("45 y 60")) {
      items.push("Por edad declarada, el plan debe dar mas peso a preservacion, liquidez y evitar caidas dificiles de recuperar.");
    } else if (ageText.includes("menos de 30") || ageText.includes("30 y 45")) {
      items.push("Por edad/horizonte, puedes aprender a usar volatilidad a tu favor, pero sin saltarte diversificacion.");
    }

    const horizonText = (horizonAnswer || "").toLowerCase();
    if (horizonText.includes("menos de 2")) {
      items.push("Horizonte corto: no uses el radar agresivo para dinero que puedas necesitar pronto.");
    } else if (horizonText.includes("10")) {
      items.push("Horizonte largo: prioriza aportaciones periodicas y tesis robustas frente a ruido mensual.");
    }

    return items;
  }, [ageAnswer, emergencyAnswer, horizonAnswer, plan.highRiskPct, plan.totalMonthly, score]);

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
      `Edad declarada: ${ageAnswer || "pendiente"}.`,
      `Horizonte: ${horizonAnswer || "pendiente"}.`,
      `Ingresos: ${incomeAnswer || "pendiente"}.`,
      `Fondo de emergencia: ${emergencyAnswer || "pendiente"}.`,
      "",
      "## Guia de asignacion educativa",
      `Renta variable orientativa: ${guide.equity}.`,
      `Base nucleo ETF/defensiva: ${guide.core}.`,
      `Satelites tacticos: ${guide.satellite}.`,
      `Riesgo alto/extremo maximo orientativo: ${guide.maxHighRisk}.`,
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
      "## Lectura macro",
      `Estado: ${plan.macro.label}.`,
      ...plan.macro.notes.map((note) => `- ${note}`),
      "",
      "## Reglas personalizadas",
      ...personalizedAdvice.map((item) => `- ${item}`),
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
  }, [ageAnswer, emergencyAnswer, guide, horizonAnswer, incomeAnswer, personalizedAdvice, plan, userProfile]);

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

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sky-400">
            <Gauge size={18} />
            <h3 className="font-bold text-slate-100">Asignacion orientativa por perfil</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Renta variable", guide.equity],
              ["Nucleo", guide.core],
              ["Satelites", guide.satellite],
              ["Riesgo alto", guide.maxHighRisk],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-extrabold text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {personalizedAdvice.map((item) => (
              <p key={item} className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-xs leading-relaxed text-emerald-100">
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-amber-400">
            <Activity size={18} />
            <h3 className="font-bold text-slate-100">Macro traducida</h3>
          </div>
          <p className="text-sm font-bold text-white">{plan.macro.label}</p>
          <div className="mt-3 space-y-2">
            {plan.macro.notes.map((note) => (
              <p key={note} className="text-xs leading-relaxed text-slate-300">{note}</p>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <span>Fed: {plan.macro.raw.fed ?? "--"}</span>
            <span>CPI: {plan.macro.raw.cpi ?? "--"}</span>
            <span>Paro: {plan.macro.raw.unrate ?? "--"}</span>
            <span>US 10Y: {plan.macro.raw.us10y ?? "--"}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="mb-3 flex items-center gap-2 text-violet-400">
          <BarChart3 size={18} />
          <h3 className="font-bold text-slate-100">Como interpretar los numeros del radar</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {plan.watchlist.slice(0, 3).map((asset) => (
            <article key={asset.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-white">{asset.ticker}</p>
                <span className="font-mono text-sm font-bold text-emerald-400">{asset.opportunityScore}/100</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{asset.name}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <dt className="text-slate-500">Riesgo</dt>
                  <dd className="font-bold text-amber-300">{asset.scores.risk}/100</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Confianza</dt>
                  <dd className="font-bold text-sky-300">{asset.scores.trust}/100</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Potencial</dt>
                  <dd className="font-bold text-emerald-300">{asset.scores.potential}/100</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Valoracion</dt>
                  <dd className="font-bold text-violet-300">{asset.valuationLabel}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                {asset.scores.risk > (score ?? 50)
                  ? "Para tu perfil, tratala como idea de estudio o posicion pequena."
                  : "Encaja mejor con tu tolerancia, pero exige validar fuente y tesis."}
              </p>
              {candidateByTicker.get(asset.ticker)?.evidence.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {candidateByTicker.get(asset.ticker)?.evidence.slice(0, 3).map((item) => (
                    <span key={item} className="rounded-md bg-slate-950 px-2 py-1 text-[10px] text-slate-400">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
              {candidateByTicker.get(asset.ticker)?.setup && (
                <p className="mt-2 text-[11px] text-sky-300">
                  Tecnico: {candidateByTicker.get(asset.ticker)?.setup}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
