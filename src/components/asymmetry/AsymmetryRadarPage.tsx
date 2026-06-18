import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  processAsymmetryCompanies,
  RISK_ORDER,
} from "../../logic/asymmetryEngine";
import {
  ProcessedAsymmetryCompany,
  AsymmetryCompany,
  AsymmetryDataSource,
} from "../../types/asymmetry";
import { fetchAsymmetryCompanies } from "../../services/asymmetryDataService";
import { SectionCard } from "../ui/SectionCard";
import { WarningBanner } from "../ui/WarningBanner";
import { AsymmetrySummaryCards } from "./AsymmetrySummaryCards";
import {
  AsymmetryFilters,
  AsymmetryFilterState,
  defaultAsymmetryFilters,
} from "./AsymmetryFilters";
import { AsymmetryTable } from "./AsymmetryTable";
import { AsymmetryDetailModal } from "./AsymmetryDetailModal";
import { CustomAnomalyScanner } from "./CustomAnomalyScanner";
import {
  Crosshair,
  Lightbulb,
  ListOrdered,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const SOURCE_META: Record<
  AsymmetryDataSource,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  real: {
    label: "Datos reales",
    cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    icon: <CheckCircle2 size={14} />,
  },
  partial: {
    label: "Datos reales parciales",
    cls: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: <AlertTriangle size={14} />,
  },
  mock: {
    label: "Datos mock",
    cls: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    icon: <Database size={14} />,
  },
};

export const AsymmetryRadarPage: React.FC = () => {
  const [filters, setFilters] = useState<AsymmetryFilterState>(defaultAsymmetryFilters);
  const [selected, setSelected] = useState<ProcessedAsymmetryCompany | null>(null);

  const [rawCompanies, setRawCompanies] = useState<AsymmetryCompany[]>([]);
  const [source, setSource] = useState<AsymmetryDataSource>("mock");
  const [note, setNote] = useState<string | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [cacheAgeMinutes, setCacheAgeMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAsymmetryCompanies(forceRefresh);
      setRawCompanies(result.companies);
      setSource(result.source);
      setNote(result.note);
      setLastUpdated(result.generatedAt || new Date().toISOString());
      // Caché backend, o caché local del frontend (localStorage)
      setCached(Boolean(result.cached) || result.fromCache);
      setCacheAgeMinutes(
        typeof result.cacheAgeMinutes === "number" ? result.cacheAgeMinutes : null
      );
    } catch (e: any) {
      setError(e?.message || "Error desconocido al cargar datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Procesado (score + riesgo + señal) sobre los datos cargados
  const processed = useMemo(
    () => processAsymmetryCompanies(rawCompanies),
    [rawCompanies]
  );

  const countries = useMemo(
    () => [...new Set(processed.map((c) => c.country))].sort(),
    [processed]
  );
  const sectors = useMemo(
    () => [...new Set(processed.map((c) => c.sector))].sort(),
    [processed]
  );

  const filtered = useMemo(() => {
    return processed.filter((c) => {
      const q = filters.search.trim().toLowerCase();
      const matchSearch =
        !q || c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q);
      const matchCountry = !filters.country || c.country === filters.country;
      const matchSector = !filters.sector || c.sector === filters.sector;
      const matchScore = c.score >= filters.minScore;
      const matchRisk =
        !filters.maxRisk || RISK_ORDER[c.riskLevel] <= RISK_ORDER[filters.maxRisk];
      // Métricas nulas (N/D) no se filtran: el dato desconocido permanece visible.
      const matchDrawdown =
        c.drawdownFrom52wHigh === null || c.drawdownFrom52wHigh >= filters.minDrawdown;
      const matchGrowth =
        c.revenueGrowth === null || c.revenueGrowth >= filters.minRevenueGrowth;
      const matchPer = filters.maxPer === "" || c.per === null || c.per <= filters.maxPer;
      const matchDebt =
        filters.maxDebt === "" || c.netDebtToEbitda === null || c.netDebtToEbitda <= filters.maxDebt;
      const matchMinCap =
        filters.minMarketCap === "" || c.marketCap === null || c.marketCap >= filters.minMarketCap;
      const matchMaxCap =
        filters.maxMarketCap === "" || c.marketCap === null || c.marketCap <= filters.maxMarketCap;

      return (
        matchSearch &&
        matchCountry &&
        matchSector &&
        matchScore &&
        matchRisk &&
        matchDrawdown &&
        matchGrowth &&
        matchPer &&
        matchDebt &&
        matchMinCap &&
        matchMaxCap
      );
    });
  }, [processed, filters]);

  const sourceMeta = SOURCE_META[source];
  const updatedText = lastUpdated
    ? new Date(lastUpdated).toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Cabecera */}
      <div className="bg-slate-900 border border-emerald-500/30 p-6 sm:p-8 rounded-3xl shadow-[0_0_40px_-10px_rgba(16,185,129,0.15)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
            <Crosshair size={28} />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Radar de Asimetría Positiva
            </h2>
            <p className="text-emerald-400 text-sm font-semibold">
              Detector de oportunidades con potencial multibagger
            </p>
          </div>
        </div>
        <p className="text-slate-300 text-base max-w-3xl leading-relaxed">
          Encuentra empresas castigadas con potencial de recuperación fuerte y riesgo controlado.
        </p>
      </div>

      {/* Estado de datos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 border border-white/5 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${sourceMeta.cls}`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : sourceMeta.icon}
            {loading
              ? "Cargando datos..."
              : `${sourceMeta.label}${cached && source !== "mock" ? " · caché backend" : ""}`}
          </span>
          <span className="text-[11px] text-slate-500">
            Última actualización: <span className="text-slate-400 font-medium">{updatedText}</span>
            {cached && cacheAgeMinutes !== null && source !== "mock" && (
              <span className="text-slate-600"> · caché de hace {cacheAgeMinutes} min</span>
            )}
          </span>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <button
            onClick={() => loadData(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Actualizando..." : "Actualizar datos"}
          </button>
          <span className="text-[10px] text-slate-600">
            Actualizar manualmente puede consumir cuota de API.
          </span>
        </div>
      </div>

      {(source === "partial" || note) && (
        <div className="text-[11px] text-amber-400/90 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2">
          {note || "Algunas métricas pueden no estar disponibles para determinados mercados."}
        </div>
      )}
      {error && (
        <div className="text-[11px] text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-2">
          {error}
        </div>
      )}

      {/* Aviso obligatorio */}
      <WarningBanner
        type="warning"
        message="Este score no es una recomendación de compra. Es una herramienta de análisis orientativa. Toda inversión conlleva riesgo."
      />

      {/* Explicación educativa */}
      <SectionCard
        title="¿Qué busca este radar?"
        icon={<Lightbulb size={18} className="text-amber-400" />}
      >
        <p className="text-sm text-slate-300 leading-relaxed">
          Este radar intenta identificar empresas con posible <strong>asimetría positiva</strong>:
          negocios que han sido castigados por el mercado, pero que conservan crecimiento, caja,
          ventaja competitiva o exposición a sectores con fuerte demanda futura. No garantiza
          resultados, pero ayuda a filtrar oportunidades para estudiarlas con más detalle.
        </p>
      </SectionCard>

      <CustomAnomalyScanner />

      {/* Tarjetas resumen */}
      <AsymmetrySummaryCards companies={processed} />

      {/* Filtros */}
      <AsymmetryFilters
        filters={filters}
        setFilters={setFilters}
        countries={countries}
        sectors={sectors}
      />

      {/* Ranking */}
      <SectionCard
        title="Ranking por Score de Asimetría"
        subtitle={`${filtered.length} de ${processed.length} empresas · ordenadas de mayor a menor score`}
        icon={<ListOrdered size={18} />}
      >
        {loading && processed.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
            <Loader2 size={18} className="animate-spin" /> Cargando empresas...
          </div>
        ) : (
          <AsymmetryTable companies={filtered} onSelect={setSelected} />
        )}
      </SectionCard>

      {/* Modal de detalle */}
      <AsymmetryDetailModal company={selected} onClose={() => setSelected(null)} />
    </div>
  );
};
