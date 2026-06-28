import React, { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Briefcase, CheckCircle2, ClipboardCheck, Compass, Gauge, Radar, Route, ShieldAlert, UserCheck } from "lucide-react";
import { MacroIndicator } from "../../types";

interface InvestorRoutinePanelProps {
  userProfile: { score: number; name: string } | null;
  macroIndicators: MacroIndicator[];
  onGoProfile: () => void;
  onGoMacro: () => void;
  onGoRadar: () => void;
  onGoPortfolio: () => void;
  onGoLab: () => void;
}

interface StoredHolding {
  ticker: string;
  amount: number;
}

const PORTFOLIO_STORAGE_KEY = "rii_local_portfolio_v1";

function readHoldings(): StoredHolding[] {
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
      }));
  } catch {
    return [];
  }
}

function hasRealMacro(indicators: MacroIndicator[]) {
  return indicators.some((indicator) => indicator.status === "real" || indicator.fromCache);
}

export const InvestorRoutinePanel: React.FC<InvestorRoutinePanelProps> = ({
  userProfile,
  macroIndicators,
  onGoProfile,
  onGoMacro,
  onGoRadar,
  onGoPortfolio,
  onGoLab,
}) => {
  const [holdings, setHoldings] = useState<StoredHolding[]>([]);

  useEffect(() => {
    const refresh = () => setHoldings(readHoldings());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const routine = useMemo(() => {
    const profileDone = Boolean(userProfile);
    const macroDone = macroIndicators.length > 0;
    const portfolioDone = holdings.length > 0;
    const macroReal = hasRealMacro(macroIndicators);

    return [
      {
        title: "1. Define tu perfil",
        status: profileDone ? "Hecho" : "Pendiente",
        done: profileDone,
        icon: <UserCheck size={18} />,
        text: profileDone
          ? `Perfil activo: ${userProfile?.name} (${userProfile?.score}/100).`
          : "Sin perfil, cualquier activo puede parecer bueno. Primero mide tolerancia al riesgo.",
        action: "Ir a perfil",
        onClick: onGoProfile,
      },
      {
        title: "2. Lee el contexto macro",
        status: macroDone ? (macroReal ? "Datos cargados" : "Simulado") : "Pendiente",
        done: macroDone,
        icon: <Gauge size={18} />,
        text: "Antes de mirar activos, revisa tipos, inflacion, curva, VIX y dolar para entender el viento de fondo.",
        action: "Ver macro",
        onClick: onGoMacro,
      },
      {
        title: "3. Estudia, no compres por impulso",
        status: "Proceso",
        done: false,
        icon: <Radar size={18} />,
        text: "Abre el radar, entra en una ficha y mira por que puede subir, por que puede bajar y que invalidaria la tesis.",
        action: "Abrir radar",
        onClick: onGoRadar,
      },
      {
        title: "4. Contrasta con tu cartera",
        status: portfolioDone ? "Cartera creada" : "Pendiente",
        done: portfolioDone,
        icon: <Briefcase size={18} />,
        text: portfolioDone
          ? `Tienes ${holdings.length} posiciones registradas. Revisa concentracion antes de anadir nada.`
          : "Registra tu cartera para evitar duplicar riesgo o concentrarte demasiado en una narrativa.",
        action: "Ver cartera",
        onClick: onGoPortfolio,
      },
      {
        title: "5. Prueba en laboratorio",
        status: "Opcional",
        done: false,
        icon: <Compass size={18} />,
        text: "Si dudas, simula una estrategia primero. El laboratorio existe para aprender sin usar dinero real.",
        action: "Abrir laboratorio",
        onClick: onGoLab,
      },
    ];
  }, [holdings.length, macroIndicators, onGoLab, onGoMacro, onGoPortfolio, onGoProfile, onGoRadar, userProfile]);

  const completed = routine.filter((item) => item.done).length;

  return (
    <section className="rounded-2xl border border-emerald-500/20 bg-slate-900/85 p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Route size={20} className="text-emerald-300" />
            Rutina guiada de inversion educativa
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Un proceso simple para usar la app sin improvisar: perfil, macro, activo, cartera y simulacion.
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Progreso</p>
          <p className="mt-1 text-lg font-extrabold text-white">{completed}/3 bases listas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {routine.map((step) => (
          <article key={step.title} className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
                {step.icon}
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                step.done ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
              }`}>
                {step.status}
              </span>
            </div>
            <h3 className="font-bold text-slate-100">{step.title}</h3>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-400">{step.text}</p>
            <button
              onClick={step.onClick}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
            >
              {step.done ? <CheckCircle2 size={14} /> : <ClipboardCheck size={14} />}
              {step.action}
            </button>
          </article>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-sky-300">
            <BookOpenCheck size={16} /> Regla de uso para principiantes
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">
            Si no puedes explicar por que un activo puede subir, por que puede bajar y que lo invalidaria, aun no esta listo para decision.
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-300">
            <ShieldAlert size={16} /> Regla de uso para avanzados
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">
            Una buena tesis tambien define tamano maximo, horizonte, catalizador, riesgo de error y plan si el mercado va en contra.
          </p>
        </div>
      </div>
    </section>
  );
};
