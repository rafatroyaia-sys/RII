import React from "react";
import { Search, SlidersHorizontal, RotateCcw } from "lucide-react";
import { AsymmetryRiskLevel } from "../../types/asymmetry";

export interface AsymmetryFilterState {
  search: string;
  country: string;
  sector: string;
  minScore: number;
  maxRisk: AsymmetryRiskLevel | "";
  minDrawdown: number;
  minRevenueGrowth: number;
  maxPer: number | "";
  maxDebt: number | "";
  minMarketCap: number | "";
  maxMarketCap: number | "";
}

export const defaultAsymmetryFilters: AsymmetryFilterState = {
  search: "",
  country: "",
  sector: "",
  minScore: 0,
  maxRisk: "",
  minDrawdown: 0,
  minRevenueGrowth: 0,
  maxPer: "",
  maxDebt: "",
  minMarketCap: "",
  maxMarketCap: "",
};

interface AsymmetryFiltersProps {
  filters: AsymmetryFilterState;
  setFilters: React.Dispatch<React.SetStateAction<AsymmetryFilterState>>;
  countries: string[];
  sectors: string[];
  id?: string;
}

const inputClass =
  "w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition-colors placeholder:text-slate-600";
const labelClass = "text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1 block";

export const AsymmetryFilters: React.FC<AsymmetryFiltersProps> = ({
  filters,
  setFilters,
  countries,
  sectors,
  id,
}) => {
  const update = <K extends keyof AsymmetryFilterState>(key: K, value: AsymmetryFilterState[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const numberOrEmpty = (raw: string): number | "" => (raw === "" ? "" : Number(raw));

  return (
    <div
      id={id}
      className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-emerald-400" /> Filtros
        </h3>
        <button
          onClick={() => setFilters(defaultAsymmetryFilters)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <RotateCcw size={13} /> Limpiar
        </button>
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <label className={labelClass}>Buscar empresa o ticker</label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Ej: ASML, Puig, Nike..."
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div>
          <label className={labelClass}>País</label>
          <select
            value={filters.country}
            onChange={(e) => update("country", e.target.value)}
            className={inputClass}
          >
            <option value="">Todos</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Sector</label>
          <select
            value={filters.sector}
            onChange={(e) => update("sector", e.target.value)}
            className={inputClass}
          >
            <option value="">Todos</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Riesgo máximo</label>
          <select
            value={filters.maxRisk}
            onChange={(e) => update("maxRisk", e.target.value as AsymmetryRiskLevel | "")}
            className={inputClass}
          >
            <option value="">Cualquiera</option>
            <option value="Bajo">Bajo</option>
            <option value="Medio">Medio</option>
            <option value="Alto">Alto</option>
            <option value="Muy alto">Muy alto</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Score mínimo: {filters.minScore}</label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minScore}
            onChange={(e) => update("minScore", Number(e.target.value))}
            className="w-full accent-emerald-500 mt-2"
          />
        </div>

        <div>
          <label className={labelClass}>Caída mín. desde máx. (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={filters.minDrawdown || ""}
            onChange={(e) => update("minDrawdown", Number(e.target.value) || 0)}
            placeholder="0"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Crecim. ingresos mín. (%)</label>
          <input
            type="number"
            value={filters.minRevenueGrowth || ""}
            onChange={(e) => update("minRevenueGrowth", Number(e.target.value) || 0)}
            placeholder="0"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>PER máximo</label>
          <input
            type="number"
            value={filters.maxPer}
            onChange={(e) => update("maxPer", numberOrEmpty(e.target.value))}
            placeholder="Sin límite"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Deuda/EBITDA máx.</label>
          <input
            type="number"
            step={0.1}
            value={filters.maxDebt}
            onChange={(e) => update("maxDebt", numberOrEmpty(e.target.value))}
            placeholder="Sin límite"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Capitalización mín. (M)</label>
          <input
            type="number"
            value={filters.minMarketCap}
            onChange={(e) => update("minMarketCap", numberOrEmpty(e.target.value))}
            placeholder="Sin límite"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Capitalización máx. (M)</label>
          <input
            type="number"
            value={filters.maxMarketCap}
            onChange={(e) => update("maxMarketCap", numberOrEmpty(e.target.value))}
            placeholder="Sin límite"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
};
