import React from "react";
import { AlertTriangle, BookOpenCheck, FileText, ShieldAlert } from "lucide-react";

const legalBlocks = [
  {
    icon: <BookOpenCheck size={18} />,
    title: "Finalidad educativa",
    text: "Radar Inteligente de Inversión está diseñado para formación financiera, simulación, comparación y organización de ideas de inversión.",
  },
  {
    icon: <ShieldAlert size={18} />,
    title: "Sin recomendación personalizada",
    text: "Las puntuaciones, rankings, escenarios y textos no son una recomendación de compra, venta o mantenimiento de activos.",
  },
  {
    icon: <AlertTriangle size={18} />,
    title: "Riesgo del usuario",
    text: "Toda inversión puede perder valor. El usuario debe contrastar fuentes, costes, fiscalidad, liquidez, horizonte y adecuación a su situación.",
  },
  {
    icon: <FileText size={18} />,
    title: "Datos y disponibilidad",
    text: "Los datos pueden venir de APIs, caché o simulaciones educativas. La app muestra el estado del dato cuando está disponible.",
  },
];

export const LegalNoticePanel: React.FC = () => {
  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
          <FileText size={20} className="text-amber-300" />
          Aviso legal educativo
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-amber-100/90">
          Marco de uso para interpretar la herramienta con prudencia. Para producción definitiva conviene revisarlo con asesoramiento legal si el proyecto crece.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {legalBlocks.map((block) => (
          <article key={block.title} className="rounded-xl border border-amber-500/15 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-amber-300">
              {block.icon}
              <h3 className="font-bold text-slate-100">{block.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-300">{block.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-300">
        Antes de tomar una decisión real, el usuario debe validar la información con fuentes oficiales o profesionales cualificados. La app ayuda a pensar mejor; no elimina el riesgo ni garantiza resultados.
      </div>
    </section>
  );
};
