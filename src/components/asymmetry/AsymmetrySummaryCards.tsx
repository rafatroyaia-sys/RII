import React from "react";
import { ProcessedAsymmetryCompany } from "../../types/asymmetry";
import { Briefcase, Gauge, Target, ShieldAlert, Trophy } from "lucide-react";

interface AsymmetrySummaryCardsProps {
  companies: ProcessedAsymmetryCompany[];
  id?: string;
}

export const AsymmetrySummaryCards: React.FC<AsymmetrySummaryCardsProps> = ({ companies, id }) => {
  const total = companies.length;
  const avgScore =
    total > 0 ? Math.round(companies.reduce((acc, c) => acc + c.score, 0) / total) : 0;
  const above70 = companies.filter((c) => c.score > 70).length;
  const highRisk = companies.filter(
    (c) => c.riskLevel === "Alto" || c.riskLevel === "Muy alto"
  ).length;
  const best = [...companies].sort((a, b) => b.score - a.score)[0];

  const cards = [
    {
      label: "Empresas analizadas",
      tooltip: "Número total de empresas en el radar de asimetría",
      value: total,
      icon: <Briefcase />,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Score medio",
      tooltip: "Promedio del Score de Asimetría de todas las empresas",
      value: `${avgScore}/100`,
      icon: <Gauge />,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      label: "Score > 70",
      tooltip: "Empresas con Score de Asimetría superior a 70 (muy interesantes o más)",
      value: above70,
      icon: <Target />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Riesgo alto",
      tooltip: "Empresas con nivel de riesgo Alto o Muy alto",
      value: highRisk,
      icon: <ShieldAlert />,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      label: "Mejor oportunidad",
      tooltip: "Empresa con el Score de Asimetría más alto actualmente",
      value: best ? best.ticker : "—",
      sub: best ? `${best.score}/100` : undefined,
      icon: <Trophy />,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div id={id} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          title={card.tooltip}
          className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex flex-col items-center text-center hover:bg-slate-800 transition-colors cursor-help"
        >
          <div className={`p-2 rounded-xl ${card.bg} ${card.color} mb-3`}>
            {React.cloneElement(card.icon as React.ReactElement, { size: 18 })}
          </div>
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
            {card.label}
          </span>
          <span className="text-lg font-bold text-white mt-1">{card.value}</span>
          {card.sub && <span className="text-[10px] text-slate-400 font-mono">{card.sub}</span>}
        </div>
      ))}
    </div>
  );
};
