import { MacroIndicator } from '../types';
import { DATA_PROVIDER_MODE, USE_PROXY_FOR_MACRO_DATA } from './dataProviderConfig';
import { fetchFredSeriesViaProxy } from './backendProxyClient';

// IMPORTANTE: En Vite, las variables VITE_* pueden quedar expuestas en el navegador.
// Esta integracion directa con APIs externas es valida para prototipo/demo.
// Para produccion debe moverse a backend o funcion serverless que oculte claves, aplique rate limits y cachee respuestas.
const FRED_API_KEY = (import.meta as any).env?.VITE_FRED_API_KEY;

const MACRO_CACHE_KEY = 'macro_data_cache';
const MACRO_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const REQUIRED_MACRO_IDS = ["FEDFUNDS", "CPI_YOY", "CORE_CPI_YOY", "GS10", "DGS2", "YIELD_CURVE_10Y2Y", "VIXCLS", "DTWEXBGS"];

interface MacroCacheEntry {
  data: MacroIndicator[];
  timestamp: number;
}

interface FredObservation {
  date: string;
  value: number;
}

type MacroTransform = "latest" | "yoy";

interface MacroSeriesConfig {
  id: string;
  fredId: string;
  name: string;
  unit: string;
  region: MacroIndicator["region"];
  transform: MacroTransform;
  limit: number;
  mockValue: number;
}

const MACRO_SERIES: MacroSeriesConfig[] = [
  { id: "FEDFUNDS", fredId: "FEDFUNDS", name: "Tipo efectivo Fed (EE.UU.)", unit: "%", region: "US", transform: "latest", limit: 1, mockValue: 5.33 },
  { id: "CPI_YOY", fredId: "CPIAUCSL", name: "Inflacion IPC YoY (EE.UU.)", unit: "% interanual", region: "US", transform: "yoy", limit: 18, mockValue: 3.1 },
  { id: "CORE_CPI_YOY", fredId: "CPILFESL", name: "Inflacion subyacente YoY (EE.UU.)", unit: "% interanual", region: "US", transform: "yoy", limit: 18, mockValue: 3.7 },
  { id: "UNRATE", fredId: "UNRATE", name: "Desempleo (EE.UU.)", unit: "%", region: "US", transform: "latest", limit: 1, mockValue: 3.7 },
  { id: "GS10", fredId: "GS10", name: "Bono Tesoro 10 anos (EE.UU.)", unit: "%", region: "US", transform: "latest", limit: 1, mockValue: 4.15 },
  { id: "DGS2", fredId: "DGS2", name: "Bono Tesoro 2 anos (EE.UU.)", unit: "%", region: "US", transform: "latest", limit: 5, mockValue: 4.7 },
  { id: "VIXCLS", fredId: "VIXCLS", name: "Volatilidad VIX", unit: "pts", region: "US", transform: "latest", limit: 5, mockValue: 16.5 },
  { id: "DTWEXBGS", fredId: "DTWEXBGS", name: "Dolar ponderado comercio", unit: "indice", region: "US", transform: "latest", limit: 5, mockValue: 121.2 },
];

const MOCK_MACRO_INDICATORS: MacroIndicator[] = [
  ...MACRO_SERIES.map((series) => ({
    id: series.id,
    requestedSymbol: series.fredId,
    providerSymbol: series.fredId,
    provider: "FRED",
    name: series.name,
    value: series.mockValue,
    unit: series.unit,
    region: series.region,
    lastUpdated: new Date().toISOString(),
    source: "mock",
    status: "simulated" as const,
    providerMode: DATA_PROVIDER_MODE,
  })),
  {
    id: "YIELD_CURVE_10Y2Y",
    requestedSymbol: "GS10-DGS2",
    providerSymbol: "GS10-DGS2",
    provider: "FRED",
    name: "Curva 10Y-2Y (EE.UU.)",
    value: -0.55,
    unit: "p.p.",
    region: "US",
    lastUpdated: new Date().toISOString(),
    source: "mock",
    status: "simulated",
    providerMode: DATA_PROVIDER_MODE,
  },
  {
    id: "ECB_RATE",
    name: "Tipo facilidad deposito (Eurozona)",
    value: 4.0,
    unit: "%",
    region: "EU",
    lastUpdated: new Date().toISOString(),
    source: "mock",
    status: "simulated",
    providerMode: DATA_PROVIDER_MODE,
  },
];

function getMacroCache(forceRefresh: boolean = false): MacroIndicator[] | null {
  if (forceRefresh) return null;
  try {
    const rawCache = localStorage.getItem(MACRO_CACHE_KEY);
    if (rawCache) {
      const entry = JSON.parse(rawCache) as MacroCacheEntry;
      const cachedIds = new Set(entry.data.map((item) => item.id));
      const hasCurrentSchema = REQUIRED_MACRO_IDS.every((id) => cachedIds.has(id));
      if (!hasCurrentSchema) return null;
      if (Date.now() - entry.timestamp < MACRO_CACHE_DURATION) {
        return entry.data.map(d => ({ ...d, fromCache: true }));
      }
    }
  } catch (e) {
    console.error("Error reading macro cache", e);
  }
  return null;
}

function getStaleMacroCacheItem(id: string): MacroIndicator | null {
  try {
    const rawCache = localStorage.getItem(MACRO_CACHE_KEY);
    if (rawCache) {
      const entry = JSON.parse(rawCache) as MacroCacheEntry;
      const cachedItem = entry.data.find(d => d.id === id);
      if (cachedItem) {
        return { ...cachedItem, fromCache: true };
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function saveMacroCache(data: MacroIndicator[]) {
  try {
    const dataToSave = data.map(d => {
      const copy = { ...d };
      delete copy.fromCache;
      return copy;
    });
    const entry: MacroCacheEntry = {
      data: dataToSave,
      timestamp: Date.now()
    };
    localStorage.setItem(MACRO_CACHE_KEY, JSON.stringify(entry));
  } catch (e) {
    console.error("Error saving macro cache", e);
  }
}

function validObservations(raw: any): FredObservation[] {
  const rows = Array.isArray(raw?.observations)
    ? raw.observations
    : raw?.date
      ? [{ date: raw.date, value: raw.value }]
      : [];

  return rows
    .map((row: any) => ({
      date: String(row.date),
      value: Number(row.value),
    }))
    .filter((row: FredObservation) => row.date && Number.isFinite(row.value));
}

function latestValidObservation(observations: FredObservation[]) {
  return observations.find((obs) => Number.isFinite(obs.value)) || null;
}

function calculateYoY(observations: FredObservation[]) {
  const latest = latestValidObservation(observations);
  if (!latest) return null;

  const latestDate = new Date(latest.date);
  const priorTarget = new Date(latestDate);
  priorTarget.setFullYear(priorTarget.getFullYear() - 1);

  const prior = observations
    .filter((obs) => obs.date !== latest.date && Number.isFinite(obs.value))
    .sort((a, b) => Math.abs(new Date(a.date).getTime() - priorTarget.getTime()) - Math.abs(new Date(b.date).getTime() - priorTarget.getTime()))[0];

  if (!prior || prior.value === 0) return null;
  return {
    value: ((latest.value / prior.value) - 1) * 100,
    date: latest.date,
  };
}

function simulatedIndicator(series: MacroSeriesConfig, reason: string): MacroIndicator {
  return {
    id: series.id,
    requestedSymbol: series.fredId,
    providerSymbol: series.fredId,
    provider: "FRED",
    name: series.name,
    value: series.mockValue,
    unit: series.unit,
    region: series.region,
    lastUpdated: new Date().toISOString(),
    source: "Simulacion interna",
    status: "simulated",
    fallbackReason: reason,
    providerMode: DATA_PROVIDER_MODE,
  };
}

async function fetchFredObservations(series: MacroSeriesConfig): Promise<FredObservation[]> {
  if (USE_PROXY_FOR_MACRO_DATA) {
    const proxyRes = await fetchFredSeriesViaProxy(series.fredId, series.limit);
    if (!proxyRes.ok) {
      throw new Error(proxyRes.reason);
    }
    return validObservations(proxyRes.data);
  }

  if (!FRED_API_KEY) {
    throw new Error("API key no configurada");
  }

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.fredId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${series.limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }
  const data = await response.json();
  return validObservations(data);
}

function buildIndicator(series: MacroSeriesConfig, observations: FredObservation[]): MacroIndicator {
  const latest = latestValidObservation(observations);
  const derived = series.transform === "yoy" ? calculateYoY(observations) : latest;
  if (!derived) {
    throw new Error("Respuesta vacia o sin observaciones validas");
  }

  return {
    id: series.id,
    requestedSymbol: series.fredId,
    providerSymbol: series.fredId,
    provider: "FRED",
    name: series.name,
    value: Number.isFinite(derived.value) ? derived.value : null,
    unit: series.unit,
    region: series.region,
    lastUpdated: derived.date ? new Date(derived.date).toISOString() : new Date().toISOString(),
    source: USE_PROXY_FOR_MACRO_DATA ? "FRED (Proxy)" : "FRED",
    status: "real",
    fromCache: false,
    providerMode: DATA_PROVIDER_MODE,
  };
}

function buildYieldCurve(results: MacroIndicator[]): MacroIndicator {
  const tenYear = results.find((item) => item.id === "GS10");
  const twoYear = results.find((item) => item.id === "DGS2");
  const fallback = MOCK_MACRO_INDICATORS.find((item) => item.id === "YIELD_CURVE_10Y2Y")!;

  if (tenYear?.value === null || twoYear?.value === null || tenYear?.value === undefined || twoYear?.value === undefined) {
    return {
      ...fallback,
      fallbackReason: "No hay datos suficientes para calcular curva 10Y-2Y",
      providerMode: DATA_PROVIDER_MODE,
    };
  }

  const isReal = tenYear.status === "real" && twoYear.status === "real";
  return {
    id: "YIELD_CURVE_10Y2Y",
    requestedSymbol: "GS10-DGS2",
    providerSymbol: "GS10-DGS2",
    provider: "FRED",
    name: "Curva 10Y-2Y (EE.UU.)",
    value: tenYear.value - twoYear.value,
    unit: "p.p.",
    region: "US",
    lastUpdated: tenYear.lastUpdated || twoYear.lastUpdated || new Date().toISOString(),
    source: isReal ? "FRED (derivado)" : "Simulacion interna",
    status: isReal ? "real" : "simulated",
    fallbackReason: isReal ? undefined : "Calculado con datos simulados o parciales",
    providerMode: DATA_PROVIDER_MODE,
  };
}

export async function fetchMacroIndicators(forceRefresh: boolean = false): Promise<MacroIndicator[]> {
  const cachedData = getMacroCache(forceRefresh);
  if (cachedData) {
    return cachedData.map(d => ({...d, provider: d.provider || 'FRED', providerMode: DATA_PROVIDER_MODE}));
  }

  const results: MacroIndicator[] = [];
  let fetchedAnyReal = false;

  for (const series of MACRO_SERIES) {
    try {
      const observations = await fetchFredObservations(series);
      const indicator = buildIndicator(series, observations);
      results.push(indicator);
      fetchedAnyReal = true;
    } catch (error) {
      let errorReasonStr = error instanceof Error ? error.message : String(error);
      if (!USE_PROXY_FOR_MACRO_DATA && (errorReasonStr.includes("Failed to fetch") || errorReasonStr.includes("NetworkError"))) {
        errorReasonStr = "Frontend bloqueado por CORS o red. Disponible solo mediante backend/proxy.";
      }

      const staleItem = getStaleMacroCacheItem(series.id);
      if (staleItem) {
        results.push({
          ...staleItem,
          status: 'partial',
          source: 'FRED cache',
          stale: true,
          errorReason: errorReasonStr,
          fallbackReason: 'FRED no disponible; usando ultima cache conocida',
          providerMode: DATA_PROVIDER_MODE,
        });
      } else {
        results.push(simulatedIndicator(series, errorReasonStr || "Usando simulacion educativa"));
      }
    }
  }

  results.push(buildYieldCurve(results));

  const euMock = MOCK_MACRO_INDICATORS.find(m => m.id === "ECB_RATE");
  if (euMock) {
    results.push({
      ...euMock,
      source: "datos simulados",
      status: "simulated",
      requestedSymbol: "ECB_RATE",
      provider: "ECB",
      fallbackReason: "Pendiente integracion BCE/ECB",
      providerMode: DATA_PROVIDER_MODE,
    });
  }

  if (fetchedAnyReal) {
    saveMacroCache(results);
  }

  return results;
}

export async function testFredConnection(): Promise<{ success: boolean; reason: string }> {
  if (USE_PROXY_FOR_MACRO_DATA) {
    const res = await fetchFredSeriesViaProxy('FEDFUNDS');
    if (res.ok) {
       return { success: true, reason: 'FRED respondio correctamente a traves del proxy backend.' };
    }
    return { success: false, reason: `Proxy devolvio error: ${res.reason}` };
  }

  if (!FRED_API_KEY) {
    return { success: false, reason: 'No hay API key configurada' };
  }
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 403) return { success: false, reason: 'FRED devolvio error HTTP 403 (posible API key invalida o bloqueada)' };
      if (response.status === 400) return { success: false, reason: 'FRED devolvio error HTTP 400 (Bad Request)' };
      return { success: false, reason: `FRED devolvio error HTTP ${response.status}` };
    }
    const data = await response.json();
    if (data && data.observations && data.observations.length > 0) {
      if (!isNaN(parseFloat(data.observations[0].value))) {
          return { success: true, reason: 'FRED respondio correctamente.' };
      }
    }
    return { success: false, reason: 'FRED devolvio respuesta sin observaciones validas.' };
  } catch (err) {
    let errStr = err instanceof Error ? err.message : String(err);
    if (errStr.includes("Failed to fetch") || errStr.includes("NetworkError")) {
       return { success: false, reason: 'Frontend bloqueado por CORS. Disponible solo mediante backend/proxy.' };
    }
    return { success: false, reason: 'No se pudo conectar con FRED desde el navegador (posible error de red).' };
  }
}
