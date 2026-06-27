import React from 'react';
import { AlertTriangle, CheckCircle2, Database, RefreshCw } from 'lucide-react';
import { DataQuality } from '../../types';

interface DataStatusBannerProps {
  quality: DataQuality;
  isRefreshing?: boolean;
}

const statusTranslations: Record<string, string> = {
  real: "Real",
  cache: "Real en cache",
  simulated: "Simulado",
  partial: "Parcial",
  error: "Error",
};

export const DataStatusBanner: React.FC<DataStatusBannerProps> = ({ quality, isRefreshing }) => {
  const isAllMock = quality.marketDataStatus === "simulated" && quality.macroDataStatus === "simulated";
  const hasError = quality.marketDataStatus === "error" || quality.macroDataStatus === "error";

  const getStatusColor = () => {
    if (hasError) return "text-red-400 bg-red-400/10 border-red-500/30";
    if (isAllMock) return "text-amber-400 bg-amber-400/10 border-amber-500/30";
    return "text-emerald-400 bg-emerald-400/10 border-emerald-500/30";
  };

  const getStatusIcon = () => {
    if (isRefreshing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (hasError) return <AlertTriangle className="h-4 w-4" />;
    if (isAllMock) return <Database className="h-4 w-4" />;
    return <CheckCircle2 className="h-4 w-4" />;
  };

  return (
    <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2 text-sm ${getStatusColor()}`}>
      {getStatusIcon()}
      <div className="flex flex-1 flex-wrap gap-4">
        <span className="font-medium">
          Mercado: <strong>{statusTranslations[quality.marketDataStatus] || quality.marketDataStatus}{quality.isMarketRateLimited && " con limite temporal"}</strong>
        </span>
        <span className="font-medium">
          Macro: <strong>{statusTranslations[quality.macroDataStatus] || quality.macroDataStatus}</strong>
        </span>
      </div>
      <div className="hidden w-full flex-col gap-1 text-xs opacity-80 sm:flex lg:mt-0 lg:w-auto">
        {quality.isMarketRateLimited ? (
          <span className="text-amber-300">
            Yahoo Finance esta limitando consultas o presenta errores. La app usa cache o datos educativos para no romper la experiencia.
          </span>
        ) : (
          <span>Datos reales, cache o simulacion de seguridad segun disponibilidad de cada proveedor.</span>
        )}
        <span className="hidden text-[11px] opacity-90 sm:block">
          <strong>Cache</strong> significa que se usa el ultimo dato real guardado para no consumir llamadas innecesarias.
        </span>
      </div>
    </div>
  );
};
