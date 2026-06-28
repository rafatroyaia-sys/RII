import React from "react";
import { AlertTriangle, CheckCircle2, Database, Scale, ShieldCheck, SlidersHorizontal } from "lucide-react";

const scoreBlocks = [
  {
    title: "Radar educativo",
    text: "Ordena activos combinando potencial, riesgo, confianza, valoracion, horizonte y sencillez. Sirve para priorizar estudio, no para dar ordenes.",
    factors: ["potencial", "riesgo", "confianza", "valoracion", "horizonte", "facilidad para principiantes"],
  },
  {
    title: "Radar de asimetria",
    text: "Busca empresas castigadas con posible relacion riesgo/recompensa interesante, pero penaliza deuda, deterioro, caja debil y momentum negativo.",
    factors: ["crecimiento", "margenes", "FCF", "deuda", "caida", "momentum", "sector"],
  },
  {
    title: "Laboratorio",
    text: "Simula reglas educativas para aprender disciplina y riesgo. No conecta con broker ni ejecuta operaciones reales.",
    factors: ["estrategia", "capital simulado", "riesgo medio", "drawdown", "diario paper"],
  },
];

const dataStates = [
  {
    label: "REAL",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    text: "Dato servido por proveedor externo o proxy backend.",
  },
  {
    label: "CACHE",
    cls: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    text: "Dato guardado para evitar limites de API. Puede tener retraso.",
  },
  {
    label: "SIMULADO",
    cls: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    text: "Dato educativo usado como fallback cuando no hay fuente disponible.",
  },
  {
    label: "PARCIAL",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    text: "Hay datos, pero faltan campos o se usa cache antigua.",
  },
];

export const MethodologyTrustPanel: React.FC = () => {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/85 p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-300" />
            Metodologia y limites de la herramienta
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Transparencia para usar el radar con cabeza: como se calculan las lecturas, que datos usa y que no debe interpretarse como recomendacion.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
          <Scale size={14} />
          Educativo, no asesoramiento
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {scoreBlocks.map((block) => (
          <article key={block.title} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-emerald-300">
              <SlidersHorizontal size={16} />
              <h3 className="font-bold text-slate-100">{block.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">{block.text}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {block.factors.map((factor) => (
                <span key={factor} className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {factor}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-100">
            <Database size={16} className="text-sky-300" />
            Lectura de calidad de datos
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {dataStates.map((state) => (
              <div key={state.label} className={`rounded-lg border p-3 ${state.cls}`}>
                <p className="text-xs font-extrabold">{state.label}</p>
                <p className="mt-1 text-xs leading-relaxed opacity-90">{state.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-amber-200">
            <AlertTriangle size={16} />
            Lo que esta app no hace
          </h3>
          <div className="grid grid-cols-1 gap-2 text-sm text-slate-300">
            {[
              "No dice que comprar o vender.",
              "No sustituye asesoramiento financiero profesional.",
              "No garantiza rentabilidad ni acierta giros de mercado.",
              "No debe usarse con dinero necesario a corto plazo.",
              "No elimina la necesidad de contrastar fuentes externas.",
            ].map((item) => (
              <div key={item} className="flex gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-emerald-200">
          <CheckCircle2 size={16} />
          Como usarla bien
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            "Primero perfil y macro; despues activos.",
            "Abrir la ficha y leer que puede mover el activo arriba y abajo.",
            "Registrar cartera para comprobar concentracion antes de anadir riesgo.",
            "Probar ideas en laboratorio si hay dudas.",
            "Definir tesis invalidada antes de actuar.",
            "Revisar fuentes, fecha, liquidez, costes y fiscalidad.",
          ].map((item) => (
            <div key={item} className="rounded-lg border border-emerald-500/10 bg-slate-950/40 p-3 text-sm text-slate-300">
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
