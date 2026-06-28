import { DataQuality, MacroIndicator, MarketData } from "../types";
import { DATA_PROVIDER_MODE } from "./dataProviderConfig";

export type ProviderId = "yahoo" | "fred" | "eodhd" | "internal";

export interface ProviderDefinition {
  id: ProviderId;
  name: string;
  role: string;
  route: string;
  credential: string;
  cadence: string;
  notes: string;
}

export interface ProviderStatus extends ProviderDefinition {
  status: "operational" | "cache" | "partial" | "simulated" | "not_configured";
  label: string;
  detail: string;
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: "yahoo",
    name: "Yahoo Finance",
    role: "Precios, variaciones e historicos de mercado",
    route: "/api/market/*",
    credential: "Sin clave propia en la app; via endpoint de mercado",
    cadence: "Cache local 12h; historicos bajo demanda",
    notes: "Proveedor gratuito/no oficial: puede limitar llamadas o cambiar respuestas.",
  },
  {
    id: "fred",
    name: "FRED",
    role: "Tipos, inflacion YoY, curva, desempleo, VIX y dolar",
    route: "/api/fred",
    credential: "FRED_API_KEY en servidor",
    cadence: "Cache local 24h",
    notes: "La serie ECB_RATE sigue como simulacion educativa hasta conectar una fuente BCE.",
  },
  {
    id: "eodhd",
    name: "EODHD",
    role: "Radar de asimetria y fundamentales/series EOD",
    route: "/api/asymmetry/companies",
    credential: "EODHD_API_KEY en servidor",
    cadence: "Cache de backend para reducir cuota",
    notes: "Alimenta el radar avanzado de anomalias/asimetria.",
  },
  {
    id: "internal",
    name: "Modelo educativo interno",
    role: "Scoring, mentores, reglas, simulaciones y fallbacks",
    route: "src/data + src/logic",
    credential: "No requiere clave",
    cadence: "Versionado con la aplicacion",
    notes: "No sustituye fuentes externas: ordena ideas para estudiar.",
  },
];

const rank = {
  real: 4,
  cache: 3,
  partial: 2,
  simulated: 1,
  error: 0,
} as const;

function bestStatus(values: Array<"real" | "cache" | "partial" | "simulated" | "error">) {
  if (values.length === 0) return "simulated";
  return values.reduce((best, value) => (rank[value] > rank[best] ? value : best), values[0]);
}

function providerStatusFromData(status: "real" | "cache" | "partial" | "simulated" | "error"): ProviderStatus["status"] {
  if (status === "real") return "operational";
  if (status === "error") return "partial";
  return status;
}

export function buildProviderStatuses(
  quality: DataQuality,
  marketDataMap: Record<string, MarketData>,
  macroIndicators: MacroIndicator[]
): ProviderStatus[] {
  const marketValues = Object.values(marketDataMap);
  const fredValues = macroIndicators.filter((item) => item.provider === "FRED" || item.id !== "ECB_RATE");
  const hasEodhdCacheFlag = sessionStorage.getItem("asymmetry_provider_last_status");

  const marketBest = bestStatus(
    marketValues
      .map((item) => (item.fromCache ? "cache" : item.status))
      .filter(Boolean) as Array<"real" | "cache" | "partial" | "simulated" | "error">
  );
  const fredBest = bestStatus(
    fredValues
      .map((item) => (item.fromCache ? "cache" : item.status))
      .filter(Boolean) as Array<"real" | "cache" | "partial" | "simulated" | "error">
  );

  return PROVIDERS.map((provider) => {
    if (provider.id === "yahoo") {
      const limited = quality.isMarketRateLimited;
      const realCount = marketValues.filter((item) => item.status === "real").length;
      const cacheCount = marketValues.filter((item) => item.fromCache || item.stale).length;
      return {
        ...provider,
        status: limited ? "partial" : providerStatusFromData(marketBest),
        label: limited ? "Limitado" : marketBest === "real" ? "Operativo" : marketBest === "cache" ? "Cache" : "Fallback",
        detail: `${realCount} activos con precio real; ${cacheCount} usando cache o dato antiguo.`,
      };
    }

    if (provider.id === "fred") {
      const simulatedEu = macroIndicators.some((item) => item.id === "ECB_RATE" && item.status === "simulated");
      return {
        ...provider,
        status: providerStatusFromData(fredBest),
        label: fredBest === "real" ? "Operativo" : fredBest === "cache" ? "Cache" : "Parcial",
        detail: simulatedEu
          ? "FRED activo para US; Eurozona pendiente de fuente BCE real."
          : "Indicadores macro servidos desde proxy.",
      };
    }

    if (provider.id === "eodhd") {
      return {
        ...provider,
        status: hasEodhdCacheFlag ? "operational" : "partial",
        label: hasEodhdCacheFlag ? "Conectado" : "Bajo demanda",
        detail: hasEodhdCacheFlag || "Se comprueba al abrir el radar de asimetria.",
      };
    }

    return {
      ...provider,
      status: "operational",
      label: "Activo",
      detail: `Scoring local activo en modo ${DATA_PROVIDER_MODE}.`,
    };
  });
}
