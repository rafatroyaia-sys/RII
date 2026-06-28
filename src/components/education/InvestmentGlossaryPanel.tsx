import React, { useMemo, useState } from "react";
import { BookOpenCheck, Search } from "lucide-react";

type GlossaryCategory = "Macro" | "Fundamental" | "Tecnico" | "Riesgo" | "Proceso";

interface GlossaryItem {
  term: string;
  category: GlossaryCategory;
  meaning: string;
  why: string;
  use: string;
}

const GLOSSARY: GlossaryItem[] = [
  {
    term: "Tipo efectivo de la Fed",
    category: "Macro",
    meaning: "Precio del dinero a corto plazo en EEUU. Marca el tono de liquidez global.",
    why: "Tipos altos suelen presionar valoraciones de acciones growth y hacen mas atractiva la renta fija.",
    use: "Si esta alto, exige mas margen de seguridad y evita pagar multiplos extremos.",
  },
  {
    term: "Inflacion IPC YoY",
    category: "Macro",
    meaning: "Variacion interanual de precios al consumidor.",
    why: "Inflacion alta puede retrasar bajadas de tipos y presionar margenes empresariales.",
    use: "Busca empresas con poder de precios y evita negocios fragiles ante costes altos.",
  },
  {
    term: "Inflacion subyacente",
    category: "Macro",
    meaning: "Inflacion sin energia ni alimentos, mas util para ver presion persistente.",
    why: "Si sigue alta, los bancos centrales suelen mantener politica restrictiva mas tiempo.",
    use: "Usala para interpretar si la mejora de inflacion es solida o solo temporal.",
  },
  {
    term: "Bono EEUU 10Y",
    category: "Macro",
    meaning: "Rentabilidad del bono estadounidense a 10 anos.",
    why: "Es una referencia para valorar acciones, bonos largos y activos de duracion.",
    use: "Si sube mucho, cuidado con growth caro; si baja, puede favorecer tecnologia y bonos largos.",
  },
  {
    term: "Curva 10Y-2Y",
    category: "Macro",
    meaning: "Diferencia entre bono EEUU a 10 anos y a 2 anos.",
    why: "Una curva invertida puede anticipar desaceleracion economica.",
    use: "Si esta muy negativa, revisa deuda, calidad y sensibilidad al ciclo.",
  },
  {
    term: "VIX",
    category: "Riesgo",
    meaning: "Indice de volatilidad esperada del S&P 500.",
    why: "VIX alto indica nerviosismo y movimientos bruscos.",
    use: "Con VIX alto, reduce tamano, divide entradas y evita operar por impulso.",
  },
  {
    term: "Dolar ponderado",
    category: "Macro",
    meaning: "Medida de fortaleza del dolar frente a socios comerciales.",
    why: "Dolar fuerte puede afectar emergentes, materias primas y beneficios internacionales.",
    use: "Comprueba si tu activo gana, pierde o se financia en dolares.",
  },
  {
    term: "PER",
    category: "Fundamental",
    meaning: "Precio de la accion dividido entre beneficio por accion.",
    why: "Ayuda a ver cuanto paga el mercado por los beneficios actuales.",
    use: "Un PER alto no es malo si el crecimiento lo justifica; sin crecimiento, es riesgo.",
  },
  {
    term: "PEG",
    category: "Fundamental",
    meaning: "PER dividido entre crecimiento esperado.",
    why: "Relaciona precio con crecimiento, util para empresas en expansion.",
    use: "PEG bajo puede ser interesante, pero solo si el crecimiento es fiable.",
  },
  {
    term: "Flujo de caja libre",
    category: "Fundamental",
    meaning: "Dinero que queda tras invertir lo necesario para operar.",
    why: "Una empresa con caja real depende menos de deuda o ampliaciones.",
    use: "En asimetrias, caja positiva reduce riesgo de supervivencia.",
  },
  {
    term: "Deuda neta / EBITDA",
    category: "Fundamental",
    meaning: "Medida aproximada de cuantas veces el EBITDA cubre la deuda neta.",
    why: "Deuda alta empeora con tipos altos y ciclos debiles.",
    use: "Si supera niveles altos, exige mas descuento y catalizador claro.",
  },
  {
    term: "Drawdown",
    category: "Tecnico",
    meaning: "Caida desde maximos.",
    why: "Una gran caida puede crear oportunidad o senalar deterioro real.",
    use: "No compres solo porque ha caido: revisa balance, margen y catalizador.",
  },
  {
    term: "Momentum",
    category: "Tecnico",
    meaning: "Fuerza reciente del precio.",
    why: "Ayuda a distinguir recuperacion, lateralidad o tendencia bajista.",
    use: "Momentum positivo confirma interes; negativo exige mas paciencia y tamano menor.",
  },
  {
    term: "Catalizador",
    category: "Proceso",
    meaning: "Hecho que puede cambiar la percepcion del mercado sobre un activo.",
    why: "Sin catalizador, un activo barato puede seguir barato mucho tiempo.",
    use: "Antes de estudiar una entrada, escribe que evento esperas y como lo comprobaras.",
  },
  {
    term: "Tesis invalidada",
    category: "Proceso",
    meaning: "Condicion que demuestra que tu idea original era equivocada.",
    why: "Evita convertir una inversion fallida en esperanza indefinida.",
    use: "Define por adelantado que dato, noticia o deterioro te haria descartar.",
  },
  {
    term: "DCA / aportacion periodica",
    category: "Proceso",
    meaning: "Invertir cantidades periodicas en vez de intentar acertar el minimo.",
    why: "Reduce riesgo emocional y dependencia del timing.",
    use: "Util para ETFs, carteras diversificadas y aprendizaje gradual.",
  },
];

const CATEGORIES: Array<GlossaryCategory | "Todos"> = ["Todos", "Macro", "Fundamental", "Tecnico", "Riesgo", "Proceso"];

export const InvestmentGlossaryPanel: React.FC = () => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GlossaryCategory | "Todos">("Todos");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY.filter((item) => {
      const matchCategory = category === "Todos" || item.category === category;
      const matchQuery = !q || [item.term, item.meaning, item.why, item.use, item.category].join(" ").toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [category, query]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpenCheck size={20} className="text-emerald-300" />
            Glosario practico del inversor
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Conceptos que aparecen en la app explicados con uso practico: que significan, por que importan y como leerlos.
          </p>
        </div>
        <label className="relative w-full lg:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar concepto..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500/60"
          />
        </label>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
              category === item
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500 hover:text-slate-200"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <article key={item.term} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="font-bold text-slate-100">{item.term}</h3>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {item.category}
              </span>
            </div>
            <div className="space-y-3 text-sm leading-relaxed">
              <p className="text-slate-300">{item.meaning}</p>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Por que importa</p>
                <p className="text-slate-300">{item.why}</p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">Como usarlo</p>
                <p className="text-slate-300">{item.use}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-sm text-slate-400">
          No hay conceptos que coincidan con esa busqueda.
        </div>
      )}
    </section>
  );
};
