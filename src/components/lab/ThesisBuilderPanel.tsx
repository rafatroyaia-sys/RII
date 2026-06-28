import React, { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, FileText, Save, Trash2 } from "lucide-react";
import { ProcessedAsset } from "../../types";

interface ThesisBuilderPanelProps {
  assets: ProcessedAsset[];
  onSelectAsset: (asset: ProcessedAsset) => void;
}

interface SavedThesis {
  id: string;
  ticker: string;
  assetName: string;
  reason: string;
  catalyst: string;
  risk: string;
  invalidation: string;
  horizon: string;
  maxWeight: string;
  createdAt: string;
}

const STORAGE_KEY = "rii_investment_theses_v1";

function readTheses(): SavedThesis[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTheses(theses: SavedThesis[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theses.slice(0, 8)));
}

export const ThesisBuilderPanel: React.FC<ThesisBuilderPanelProps> = ({ assets, onSelectAsset }) => {
  const sortedAssets = useMemo(() => [...assets].sort((a, b) => b.opportunityScore - a.opportunityScore), [assets]);
  const [ticker, setTicker] = useState(sortedAssets[0]?.ticker ?? "");
  const [reason, setReason] = useState("");
  const [catalyst, setCatalyst] = useState("");
  const [risk, setRisk] = useState("");
  const [invalidation, setInvalidation] = useState("");
  const [horizon, setHorizon] = useState("12-36 meses");
  const [maxWeight, setMaxWeight] = useState("5%");
  const [saved, setSaved] = useState<SavedThesis[]>([]);

  useEffect(() => {
    setSaved(readTheses());
  }, []);

  const selectedAsset = sortedAssets.find((asset) => asset.ticker === ticker) ?? sortedAssets[0];
  const completed = [reason, catalyst, risk, invalidation, horizon, maxWeight].filter((value) => value.trim().length >= 3).length;
  const canSave = Boolean(selectedAsset) && completed >= 5;

  const saveThesis = () => {
    if (!selectedAsset || !canSave) return;

    const thesis: SavedThesis = {
      id: `${selectedAsset.ticker}-${Date.now()}`,
      ticker: selectedAsset.ticker,
      assetName: selectedAsset.name,
      reason: reason.trim(),
      catalyst: catalyst.trim(),
      risk: risk.trim(),
      invalidation: invalidation.trim(),
      horizon: horizon.trim(),
      maxWeight: maxWeight.trim(),
      createdAt: new Date().toISOString(),
    };

    const next = [thesis, ...saved].slice(0, 8);
    setSaved(next);
    writeTheses(next);
    setReason("");
    setCatalyst("");
    setRisk("");
    setInvalidation("");
  };

  const deleteThesis = (id: string) => {
    const next = saved.filter((item) => item.id !== id);
    setSaved(next);
    writeTheses(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <FileText size={18} className="text-cyan-300" />
            Constructor de tesis educativa
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
            Una idea no está madura hasta que puedes escribir por qué existe, qué la puede confirmar y qué la invalidaría.
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tesis completa</p>
          <p className="mt-1 text-lg font-extrabold text-white">{completed}/6 puntos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Activo</span>
            <select
              value={selectedAsset?.ticker ?? ""}
              onChange={(event) => setTicker(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-cyan-400"
            >
              {sortedAssets.map((asset) => (
                <option key={asset.ticker} value={asset.ticker}>{asset.ticker} · {asset.name}</option>
              ))}
            </select>
          </label>

          {selectedAsset && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-cyan-300">{selectedAsset.ticker}</p>
                  <h4 className="font-bold text-white">{selectedAsset.name}</h4>
                </div>
                <button onClick={() => onSelectAsset(selectedAsset)} className="text-xs font-bold text-emerald-300 hover:text-emerald-200">
                  Abrir ficha
                </button>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">{selectedAsset.radarReason}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <span className="rounded-lg bg-slate-950 px-3 py-2 text-slate-400">Riesgo: <strong className="text-slate-100">{selectedAsset.riskLevel}</strong></span>
                <span className="rounded-lg bg-slate-950 px-3 py-2 text-slate-400">Valoración: <strong className="text-slate-100">{selectedAsset.valuationLabel}</strong></span>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-relaxed text-amber-100">
            Si no puedes escribir la invalidación, no tienes tesis: tienes una opinión.
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Por qué merece estudio</span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400" placeholder="Ejemplo: negocio de calidad, caída razonable, balance sólido..." />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Catalizador</span>
              <textarea value={catalyst} onChange={(event) => setCatalyst(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400" placeholder="Qué tendría que mejorar" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Riesgo principal</span>
              <textarea value={risk} onChange={(event) => setRisk(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400" placeholder="Qué puede salir mal" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Qué invalidaría la tesis</span>
              <textarea value={invalidation} onChange={(event) => setInvalidation(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400" placeholder="Ejemplo: deterioro de márgenes, deuda, pérdida de cuota, tipos más altos..." />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Horizonte</span>
              <input value={horizon} onChange={(event) => setHorizon(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Peso máximo educativo</span>
              <input value={maxWeight} onChange={(event) => setMaxWeight(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400" />
            </label>
          </div>

          <button
            onClick={saveThesis}
            disabled={!canSave}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            <Save size={16} />
            Guardar tesis educativa
          </button>
        </div>
      </div>

      {saved.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-100">
            <ClipboardCheck size={16} className="text-emerald-300" />
            Tesis guardadas en este navegador
          </h4>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {saved.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-cyan-300">{item.ticker}</p>
                    <h5 className="font-bold text-white">{item.assetName}</h5>
                  </div>
                  <button onClick={() => deleteThesis(item.id)} aria-label="Eliminar tesis" className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-rose-300">
                    <Trash2 size={15} />
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-slate-300">{item.reason}</p>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-400 sm:grid-cols-2">
                  <span>Catalizador: {item.catalyst}</span>
                  <span>Riesgo: {item.risk}</span>
                  <span>Invalidación: {item.invalidation}</span>
                  <span>Horizonte/peso: {item.horizon} · {item.maxWeight}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
