import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Brain, CheckCircle2, ClipboardCheck, FlaskConical, Gauge, ShieldCheck, UserCheck, WalletCards } from "lucide-react";
import { MacroIndicator } from "../../types";

interface DecisionChecklistPanelProps {
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
    return parsed.filter((item) => item?.ticker);
  } catch {
    return [];
  }
}

function hasMacroContext(indicators: MacroIndicator[]) {
  return indicators.some((indicator) => indicator.status === "real" || indicator.fromCache || indicator.status === "simulated");
}

export const DecisionChecklistPanel: React.FC<DecisionChecklistPanelProps> = ({
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

  const checks = useMemo(() => {
    const profileDone = Boolean(userProfile);
    const macroDone = hasMacroContext(macroIndicators);
    const portfolioDone = holdings.length > 0;

    return [
      {
        title: "Perfil y horizonte",
        done: profileDone,
        icon: <UserCheck size={18} />,
        text: profileDone
          ? `Perfil activo: ${userProfile?.name}. Las ideas deben encajar con esa tolerancia.`
          : "Antes de estudiar activos concretos, mide tolerancia al riesgo y horizonte temporal.",
        action: "Completar perfil",
        onClick: onGoProfile,
      },
      {
        title: "Contexto macro",
        done: macroDone,
        icon: <Gauge size={18} />,
        text: "Revisa tipos, inflación, curva, bonos, VIX y dólar para no analizar activos aislados del ciclo.",
        action: "Ver macro",
        onClick: onGoMacro,
      },
      {
        title: "Tesis escrita",
        done: false,
        icon: <Brain size={18} />,
        text: "El usuario debería poder explicar por qué podría subir, por qué podría bajar y qué invalidaría la idea.",
        action: "Abrir radar",
        onClick: onGoRadar,
      },
      {
        title: "Encaje en cartera",
        done: portfolioDone,
        icon: <WalletCards size={18} />,
        text: portfolioDone
          ? `Hay ${holdings.length} posiciones registradas. Revisa concentración antes de añadir otra exposición.`
          : "Sin cartera registrada es fácil duplicar riesgo, sector, divisa o narrativa sin darte cuenta.",
        action: "Ver cartera",
        onClick: onGoPortfolio,
      },
      {
        title: "Prueba sin dinero real",
        done: false,
        icon: <FlaskConical size={18} />,
        text: "Si la idea depende de timing, momentum o una regla concreta, primero conviene probarla en simulación.",
        action: "Abrir laboratorio",
        onClick: onGoLab,
      },
    ];
  }, [holdings.length, macroIndicators, onGoLab, onGoMacro, onGoPortfolio, onGoProfile, onGoRadar, userProfile]);

  const completed = checks.filter((check) => check.done).length;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <ClipboardCheck size={20} className="text-emerald-300" />
            Checklist antes de decidir
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
            Un filtro práctico para pasar de "me gusta este activo" a "lo entiendo, sé qué vigilar y sé qué riesgo asumo".
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Bases cubiertas</p>
          <p className="mt-1 text-lg font-extrabold text-white">{completed}/3 esenciales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {checks.map((check) => (
          <article key={check.title} className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className={`rounded-lg p-2 ${check.done ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-300"}`}>
                {check.icon}
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                check.done ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
              }`}>
                {check.done ? "Cubierto" : "Revisar"}
              </span>
            </div>
            <h3 className="font-bold text-slate-100">{check.title}</h3>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-400">{check.text}</p>
            <button
              onClick={check.onClick}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
            >
              {check.done ? <CheckCircle2 size={14} /> : <ClipboardCheck size={14} />}
              {check.action}
            </button>
          </article>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-300">
            <ShieldCheck size={16} /> Buena señal
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">
            La idea tiene sentido cuando perfil, macro, tesis, cartera y tamaño de posición apuntan en la misma dirección.
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-300">
            <AlertTriangle size={16} /> Señal de pausa
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">
            Si solo hay una narrativa atractiva pero no hay límites, fuente, horizonte o plan de salida, todavía es estudio.
          </p>
        </div>
      </div>
    </section>
  );
};
