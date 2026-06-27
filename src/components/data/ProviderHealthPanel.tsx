import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Database, ServerCog, ShieldCheck } from "lucide-react";
import { DataQuality, MacroIndicator, MarketData } from "../../types";
import { buildProviderStatuses, ProviderStatus } from "../../services/providerRegistry";

interface ProviderHealthPanelProps {
  quality: DataQuality;
  marketDataMap: Record<string, MarketData>;
  macroIndicators: MacroIndicator[];
}

function statusClasses(status: ProviderStatus["status"]) {
  if (status === "operational") return "border-emerald-500/25 bg-emerald-500/5 text-emerald-300";
  if (status === "cache") return "border-sky-500/25 bg-sky-500/5 text-sky-300";
  if (status === "partial") return "border-amber-500/25 bg-amber-500/5 text-amber-300";
  if (status === "not_configured") return "border-rose-500/25 bg-rose-500/5 text-rose-300";
  return "border-slate-600/60 bg-slate-800/40 text-slate-300";
}

function StatusIcon({ status }: { status: ProviderStatus["status"] }) {
  if (status === "operational") return <CheckCircle2 size={16} />;
  if (status === "cache") return <Clock3 size={16} />;
  if (status === "partial") return <AlertTriangle size={16} />;
  return <Database size={16} />;
}

export const ProviderHealthPanel: React.FC<ProviderHealthPanelProps> = ({
  quality,
  marketDataMap,
  macroIndicators,
}) => {
  const statuses = useMemo(
    () => buildProviderStatuses(quality, marketDataMap, macroIndicators),
    [quality, marketDataMap, macroIndicators]
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-400">
            <ServerCog size={18} />
            <h3 className="text-sm font-bold uppercase tracking-widest">Centro de control de datos</h3>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Mapa de proveedores reales, cache y simulaciones educativas. Las claves quedan en servidor.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
          <ShieldCheck size={14} />
          Proxy seguro
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statuses.map((provider) => (
          <article key={provider.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-100">{provider.name}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{provider.role}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClasses(provider.status)}`}>
                <StatusIcon status={provider.status} />
                {provider.label}
              </span>
            </div>
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-slate-500">Ruta</dt>
                <dd className="font-mono text-slate-300">{provider.route}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Credencial</dt>
                <dd className="text-slate-300">{provider.credential}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Frescura</dt>
                <dd className="text-slate-300">{provider.cadence}</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-400">
              {provider.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};
