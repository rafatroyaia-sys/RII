/**
 * Núcleo de integración con EODHD para el Radar de Asimetría.
 *
 * SOLO se ejecuta en el backend (Netlify Function o servidor Express local).
 * NUNCA debe importarse desde el frontend: aquí se usa la API key y nunca debe
 * llegar al cliente. El frontend solo llama al endpoint /api/asymmetry/companies.
 *
 * Convierte la respuesta de EODHD al tipo AsymmetryCompany. Si una métrica no
 * está disponible, se deja como `null` (la app la trata con penalización suave
 * y la muestra como "N/D"). Si una empresa falla por completo, se cae al dato
 * mock equivalente para no romper la tabla.
 */

import type {
  AsymmetryCompany,
  AsymmetryDataResponse,
  MarginTrend,
  FcfStatus,
  SectorCategory,
} from "../types/asymmetry";
import { asymmetryMockData } from "../data/asymmetryMockData";

const EODHD_BASE = "https://eodhd.com/api";

/**
 * Activar SOLO si tu plan EODHD incluye la API de Fundamentals (de pago).
 *
 * - false (por defecto / plan gratuito): modo HÍBRIDO. Se obtienen de EODHD
 *   datos reales de MERCADO (precio, caída desde máximos de 52 semanas y
 *   momentum) con una única llamada EOD por ticker; los FUNDAMENTALES
 *   (crecimiento, márgenes, PER, PEG, deuda, FCF...) se toman del mock. Las
 *   empresas quedan marcadas como "Datos reales parciales".
 * - true (plan de pago con Fundamentals): se traen TODOS los datos reales.
 *
 * El plan gratuito devuelve 403 en /fundamentals y limita a 20 llamadas/día,
 * por eso el modo híbrido usa 1 sola llamada por ticker.
 */
export const USE_FUNDAMENTALS = false;

/** Lista inicial de tickers (símbolo EODHD + ticker base para casar con mock). */
export const EODHD_TICKERS: { eod: string; base: string }[] = [
  { eod: "FDS.US", base: "FDS" },
  { eod: "LSEG.LSE", base: "LSEG" },
  { eod: "PUIG.MC", base: "PUIG" },
  { eod: "ROVI.MC", base: "ROVI" },
  { eod: "ASML.AS", base: "ASML" },
  { eod: "MSFT.US", base: "MSFT" },
  { eod: "TSM.US", base: "TSM" },
  { eod: "ADYEN.AS", base: "ADYEN" },
  { eod: "NKE.US", base: "NKE" },
  { eod: "UNH.US", base: "UNH" },
  { eod: "BFIT.AS", base: "BFIT" },
  { eod: "285A.TSE", base: "285A.T" },
];

const mockByTicker: Record<string, AsymmetryCompany> = Object.fromEntries(
  asymmetryMockData.map((c) => [c.ticker, c])
);

// --- Helpers numéricos seguros ---------------------------------------------

function num(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return typeof n === "number" && isFinite(n) ? n : null;
}

/** Devuelve los valores anuales (array) ordenados de más reciente a más antiguo. */
function yearlyValues<T = any>(node: any): T[] {
  if (!node || typeof node !== "object") return [];
  return Object.keys(node)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((k) => node[k]);
}

// --- Clasificación de sector (viento de cola) ------------------------------

const FAVORED = [
  "semiconduct",
  "software",
  "information technology",
  "internet",
  "data",
  "capital markets",
  "financial",
  "cyber",
  "security",
  "health",
  "medical",
  "drug",
  "pharma",
  "biotech",
  "life sciences",
  "energy",
  "renewable",
  "solar",
  "payment",
  "fintech",
  "automation",
  "robot",
  "luxury",
  "footwear",
  "apparel",
  "beauty",
  "personal products",
  "household & personal",
];

const DECLINING = ["tobacco", "coal", "newspaper", "printing", "department stores"];

export function classifySector(sector?: string, industry?: string): SectorCategory {
  const hay = `${sector || ""} ${industry || ""}`.toLowerCase();
  if (!hay.trim()) return "neutro";
  if (DECLINING.some((k) => hay.includes(k))) return "deterioro";
  if (FAVORED.some((k) => hay.includes(k))) return "favorecido";
  return "neutro";
}

// --- Llamadas a EODHD -------------------------------------------------------

async function fetchJSON(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Normaliza fundamentals + real-time de EODHD a AsymmetryCompany. */
function normalize(
  base: string,
  fundamentals: any,
  realtime: any
): AsymmetryCompany {
  const mock = mockByTicker[base];
  const general = fundamentals?.General || {};
  const highlights = fundamentals?.Highlights || {};
  const technicals = fundamentals?.Technicals || {};
  const financials = fundamentals?.Financials || {};

  // Precio actual (último cierre)
  const price = num(realtime?.close) ?? num(realtime?.previousClose);

  // Capitalización en millones
  const mcapAbs = num(highlights?.MarketCapitalization);
  const marketCap = mcapAbs !== null ? Math.round(mcapAbs / 1_000_000) : null;

  // Caída desde máximos de 52 semanas
  const high52 = num(technicals?.["52WeekHigh"]);
  let drawdownFrom52wHigh: number | null = null;
  if (price !== null && high52 !== null && high52 > 0) {
    drawdownFrom52wHigh = Math.max(0, Math.round(((high52 - price) / high52) * 100));
  }

  // Income statement anual para crecimiento de ingresos y tendencia de margen
  const income = yearlyValues(financials?.Income_Statement?.yearly);
  const revCur = num(income[0]?.totalRevenue);
  const revPrev = num(income[1]?.totalRevenue);
  let revenueGrowth: number | null = null;
  if (revCur !== null && revPrev !== null && revPrev !== 0) {
    revenueGrowth = Math.round(((revCur - revPrev) / Math.abs(revPrev)) * 100);
  } else {
    const qoq = num(highlights?.QuarterlyRevenueGrowthYOY);
    if (qoq !== null) revenueGrowth = Math.round(qoq * 100);
  }

  // Margen operativo
  let operatingMargin: number | null = null;
  const opMarginTTM = num(highlights?.OperatingMarginTTM);
  if (opMarginTTM !== null) {
    operatingMargin = Math.round(opMarginTTM * 100);
  } else if (revCur && num(income[0]?.operatingIncome) !== null) {
    operatingMargin = Math.round((num(income[0]?.operatingIncome)! / revCur) * 100);
  }

  // Tendencia de margen (compara los dos últimos ejercicios)
  let marginTrend: MarginTrend | null = null;
  const opCur = num(income[0]?.operatingIncome);
  const opPrev = num(income[1]?.operatingIncome);
  if (opCur !== null && opPrev !== null && revCur && revPrev) {
    const mCur = (opCur / revCur) * 100;
    const mPrev = (opPrev / revPrev) * 100;
    if (mCur > mPrev + 1) marginTrend = "creciente";
    else if (mCur < mPrev - 1) marginTrend = "deteriorando";
    else marginTrend = "estable";
  }

  // Deuda neta / EBITDA
  const ebitda = num(highlights?.EBITDA);
  const balance = yearlyValues(financials?.Balance_Sheet?.yearly);
  let netDebt = num(balance[0]?.netDebt);
  if (netDebt === null) {
    const longDebt = num(balance[0]?.longTermDebt) ?? 0;
    const shortDebt = num(balance[0]?.shortTermDebt) ?? 0;
    const cash = num(balance[0]?.cashAndShortTermInvestments) ?? num(balance[0]?.cash) ?? 0;
    if (balance[0]) netDebt = longDebt + shortDebt - cash;
  }
  let netDebtToEbitda: number | null = null;
  if (netDebt !== null && ebitda !== null && ebitda > 0) {
    netDebtToEbitda = Math.round((netDebt / ebitda) * 10) / 10;
  }

  // PER y PEG
  const per = num(highlights?.PERatio);
  let peg = num(highlights?.PEGRatio);
  if ((peg === null || peg === 0) && per !== null && revenueGrowth && revenueGrowth > 0) {
    peg = Math.round((per / revenueGrowth) * 10) / 10;
  }

  // Flujo de caja libre (FCF) a partir del cash flow anual
  const cashflow = yearlyValues(financials?.Cash_Flow?.yearly);
  const fcfCur = num(cashflow[0]?.freeCashFlow);
  const fcfPrev = num(cashflow[1]?.freeCashFlow);
  let fcf: FcfStatus | null = null;
  if (fcfCur !== null) {
    if (fcfCur <= 0) fcf = "negativo";
    else if (fcfPrev !== null) fcf = fcfCur >= fcfPrev ? "positivo_creciente" : "positivo_irregular";
    else fcf = "positivo_irregular";
  }

  // Momentum: media de 50 días disponible; el retorno a 3 meses no se calcula
  // aquí para no disparar llamadas extra (queda como N/D).
  const ma50 = num(technicals?.["50DayMA"]);
  const aboveMA50 = price !== null && ma50 !== null ? price > ma50 : null;

  const sector = general?.Sector || mock?.sector || "N/D";
  const industry = general?.Industry || undefined;
  const sectorCategory = classifySector(general?.Sector, general?.Industry);

  // Detección de datos parciales (métricas clave ausentes)
  const keyMetrics = [price, marketCap, revenueGrowth, operatingMargin, per, fcf];
  const isPartial = keyMetrics.some((m) => m === null);

  return {
    id: mock?.id || base.toLowerCase(),
    name: general?.Name || mock?.name || base,
    ticker: base,
    country: general?.CountryName || mock?.country || "N/D",
    sector,
    sectorCategory,
    industry,
    lastUpdated: new Date().toISOString(),

    price,
    currency: general?.CurrencyCode || mock?.currency || "USD",
    marketCap,
    drawdownFrom52wHigh,

    revenueGrowth,
    operatingMargin,
    marginTrend,
    netDebtToEbitda,
    per,
    peg,
    fcf,

    momentum3m: null,
    aboveMA50,
    momentumState: null,

    // Factores cualitativos de riesgo: se heredan del mock (no vienen de EODHD)
    isEmergingMarket: mock?.isEmergingMarket,
    isCyclical: mock?.isCyclical,
    highVolatility: mock?.highVolatility,
    customerConcentration: mock?.customerConcentration,
    regulatoryRisk: mock?.regulatoryRisk,

    // Narrativa editorial: se reutiliza la del mock si existe
    executiveSummary: mock?.executiveSummary || `Datos de mercado de ${general?.Name || base}.`,
    rankingReason:
      mock?.rankingReason ||
      "Posición en el ranking según las métricas reales obtenidas de EODHD.",
    strengths: mock?.strengths || [],
    risks: mock?.risks || [],
    catalystsToRise: mock?.catalystsToRise || [],
    redFlagsToDiscard: mock?.redFlagsToDiscard || [],

    isMockData: false,
    dataStatus: isPartial ? "partial" : "real",
  };
}

// --- Modo híbrido (plan gratuito): solo datos EOD ---------------------------

interface EodBar {
  date: string;
  close?: number;
  high?: number;
  adjusted_close?: number;
}

/** Descarga ~1 año de barras diarias (más reciente primero). */
async function fetchEodSeries(sym: string, token: string): Promise<EodBar[] | null> {
  const data = await fetchJSON(
    `${EODHD_BASE}/eod/${sym}?api_token=${token}&fmt=json&period=d&order=d&limit=260`
  );
  return Array.isArray(data) && data.length > 0 ? (data as EodBar[]) : null;
}

/**
 * Overlay de datos reales de mercado (precio, caída desde máximos, momentum)
 * sobre los fundamentales del mock. Si no hay barras, devuelve el mock íntegro.
 */
function normalizeHybrid(base: string, bars: EodBar[] | null): AsymmetryCompany | null {
  const mock = mockByTicker[base];
  if (!mock) return null;
  if (!bars || bars.length === 0) return { ...mock, dataStatus: "mock" };

  const closeOf = (b: EodBar) => num(b.adjusted_close) ?? num(b.close);
  const price = closeOf(bars[0]);
  if (price === null) return { ...mock, dataStatus: "mock" };

  // Caída desde máximos de 52 semanas
  const highs = bars.map((b) => num(b.high) ?? closeOf(b)).filter((v): v is number => v !== null);
  const high52 = highs.length ? Math.max(...highs) : null;
  const drawdownFrom52wHigh =
    high52 && high52 > 0 ? Math.max(0, Math.round(((high52 - price) / high52) * 100)) : null;

  // Media de 50 sesiones
  const last50 = bars.slice(0, 50).map(closeOf).filter((v): v is number => v !== null);
  const ma50 = last50.length >= 30 ? last50.reduce((a, b) => a + b, 0) / last50.length : null;
  const aboveMA50 = ma50 !== null ? price > ma50 : null;

  // Momentum a ~3 meses (≈63 sesiones)
  const ref = closeOf(bars[63]);
  const momentum3m = ref && ref > 0 ? Math.round(((price - ref) / ref) * 100) : null;

  // Estado de momentum
  let momentumState = mock.momentumState;
  if (momentum3m !== null) {
    if (aboveMA50 && momentum3m > 0) momentumState = "recuperando";
    else if (aboveMA50 === false && momentum3m <= -5) momentumState = "bajista";
    else momentumState = "lateral";
  }

  return {
    ...mock,
    price,
    drawdownFrom52wHigh,
    momentum3m,
    aboveMA50,
    momentumState,
    lastUpdated: bars[0].date || new Date().toISOString(),
    isMockData: false,
    dataStatus: "partial",
  };
}

/**
 * Obtiene y normaliza todas las empresas desde EODHD.
 *
 * - Modo de pago (USE_FUNDAMENTALS=true): fundamentals + real-time por ticker.
 * - Modo híbrido (plan gratuito): solo EOD por ticker; precio/caída/momentum
 *   reales y fundamentales del mock.
 * Si un ticker falla por completo, se usa su equivalente mock.
 */
export async function fetchAsymmetryFromEODHD(apiKey: string): Promise<AsymmetryDataResponse> {
  const token = encodeURIComponent(apiKey);

  const results = await Promise.all(
    EODHD_TICKERS.map(async ({ eod, base }) => {
      const sym = encodeURIComponent(eod);

      if (!USE_FUNDAMENTALS) {
        // Plan gratuito: 1 sola llamada EOD por ticker
        const bars = await fetchEodSeries(sym, token);
        return normalizeHybrid(base, bars);
      }

      const [fundamentals, realtime] = await Promise.all([
        fetchJSON(`${EODHD_BASE}/fundamentals/${sym}?api_token=${token}&fmt=json`),
        fetchJSON(`${EODHD_BASE}/real-time/${sym}?api_token=${token}&fmt=json`),
      ]);

      // Si no hay fundamentals, caemos al mock de esa empresa
      if (!fundamentals || !fundamentals.General) {
        const mock = mockByTicker[base];
        if (mock) return { ...mock, dataStatus: "mock" as const };
        return null;
      }
      return normalize(base, fundamentals, realtime);
    })
  );

  const companies = results.filter((c): c is AsymmetryCompany => c !== null);

  // Determinar el origen global
  const anyReal = companies.some((c) => c.dataStatus === "real" || c.dataStatus === "partial");
  const anyMissing = companies.some((c) => c.dataStatus === "partial" || c.dataStatus === "mock");
  let source: AsymmetryDataResponse["source"] = "mock";
  if (anyReal && !anyMissing) source = "real";
  else if (anyReal && anyMissing) source = "partial";

  let note: string | undefined;
  if (!USE_FUNDAMENTALS && anyReal) {
    note =
      "Modo híbrido (plan gratuito): precio, caída desde máximos y momentum son reales; los fundamentales provienen del modelo. Algunas métricas pueden aparecer como N/D.";
  } else if (anyMissing) {
    note = "Algunas métricas pueden no estar disponibles para determinados mercados.";
  }

  return {
    source,
    companies,
    note,
    generatedAt: new Date().toISOString(),
  };
}
