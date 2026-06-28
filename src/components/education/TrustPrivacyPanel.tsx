import React from "react";
import { Database, FileWarning, LockKeyhole, ShieldCheck } from "lucide-react";

const trustItems = [
  {
    icon: <LockKeyhole size={18} />,
    title: "Datos personales en local",
    text: "Perfil, cartera, tesis y simulaciones se guardan en el navegador del usuario. No se publican ni se comparten con otros usuarios.",
  },
  {
    icon: <Database size={18} />,
    title: "Datos de mercado trazables",
    text: "La app distingue entre dato real, cache, parcial, error y simulación educativa para no mezclar señales con certezas.",
  },
  {
    icon: <FileWarning size={18} />,
    title: "No es asesoramiento financiero",
    text: "El objetivo es enseñar a comparar, vigilar riesgos y formular tesis. No sustituye asesoramiento profesional ni decide por el usuario.",
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Sin broker ni dinero real",
    text: "El laboratorio y el paper trading no conectan con brokers, no ejecutan órdenes y no piden claves financieras.",
  },
];

export const TrustPrivacyPanel: React.FC = () => {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
          <ShieldCheck size={20} className="text-emerald-300" />
          Confianza, privacidad y uso responsable
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
          Una herramienta de inversión educativa seria debe explicar sus límites con la misma claridad con la que muestra oportunidades.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {trustItems.map((item) => (
          <article key={item.title} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-emerald-300">
              {item.icon}
              <h3 className="font-bold text-slate-100">{item.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">{item.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="mb-2 text-sm font-bold text-emerald-300">Uso correcto</h3>
          <p className="text-sm leading-relaxed text-slate-300">
            Usar la app para aprender, comparar, preparar preguntas, documentar tesis y evitar decisiones impulsivas.
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="mb-2 text-sm font-bold text-amber-300">Uso que hay que evitar</h3>
          <p className="text-sm leading-relaxed text-slate-300">
            Copiar una puntuación como señal de compra, ignorar perfil de riesgo o invertir dinero necesario a corto plazo.
          </p>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <h3 className="mb-2 text-sm font-bold text-sky-300">Criterio profesional</h3>
          <p className="text-sm leading-relaxed text-slate-300">
            Toda idea debe pasar por perfil, macro, tesis, cartera, tamaño máximo y condición de invalidación.
          </p>
        </div>
      </div>
    </section>
  );
};
