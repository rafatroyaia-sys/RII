/**
 * Radar de Asimetría Positiva - Modelos de Datos
 *
 * Tipos para la herramienta que detecta empresas con una posible
 * relación rentabilidad/riesgo asimétrica (potencial multibagger),
 * siempre con enfoque educativo y prudente.
 */

/** Clasificación del sector respecto a su "viento de cola" estructural. */
export type SectorCategory = "favorecido" | "neutro" | "deterioro";

/** Tendencia del margen operativo. */
export type MarginTrend = "creciente" | "estable" | "mejorando" | "deteriorando";

/** Estado del flujo de caja libre (FCF). */
export type FcfStatus = "positivo_creciente" | "positivo_irregular" | "negativo";

/** Estado de momentum reciente del precio. */
export type MomentumState = "recuperando" | "lateral" | "bajista";

/** Nivel de riesgo independiente del score de asimetría. */
export type AsymmetryRiskLevel = "Bajo" | "Medio" | "Alto" | "Muy alto";

/** Señal final derivada del score 0-100. */
export type AsymmetrySignal =
  | "Descartar"
  | "Vigilar"
  | "Interesante"
  | "Muy interesante"
  | "Oportunidad excepcional";

/**
 * Datos en crudo de una empresa analizada por el radar.
 * Diseñado para ser fácilmente rellenable desde una API financiera real.
 */
export interface AsymmetryCompany {
  id: string;
  name: string;
  ticker: string;
  country: string;
  /** Descripción libre del sector (mostrada en la tabla). */
  sector: string;
  /** Clasificación usada para puntuar el "viento de cola" del sector. */
  sectorCategory: SectorCategory;

  /** Industria concreta (más específica que el sector). Opcional. */
  industry?: string;
  /** Fecha ISO de la última actualización de los datos (opcional). */
  lastUpdated?: string;

  // --- Datos de mercado ---
  // NOTA: las métricas pueden ser null si la API no las proporciona para un
  // mercado concreto. El scoring las trata con penalización suave y la UI
  // muestra "N/D". Los datos mock las traen siempre completas.
  price: number | null;
  currency: string;
  /** Capitalización bursátil en millones de la divisa de referencia. */
  marketCap: number | null;
  /** Caída desde máximos de 52 semanas, en % positivo (42 = -42%). */
  drawdownFrom52wHigh: number | null;

  // --- Fundamentales ---
  /** Crecimiento de ingresos anual en %. */
  revenueGrowth: number | null;
  /** Margen operativo en %. */
  operatingMargin: number | null;
  marginTrend: MarginTrend | null;
  /** Deuda neta / EBITDA. */
  netDebtToEbitda: number | null;
  /** PER actual. */
  per: number | null;
  /** PEG (PER / crecimiento). */
  peg: number | null;
  fcf: FcfStatus | null;

  // --- Técnico ---
  /** Rentabilidad del precio en los últimos 3 meses, en %. */
  momentum3m: number | null;
  /** ¿Cotiza por encima de la media de 50 días? */
  aboveMA50: boolean | null;
  momentumState: MomentumState | null;

  // --- Factores de riesgo cualitativos ---
  isEmergingMarket?: boolean;
  isCyclical?: boolean;
  highVolatility?: boolean;
  customerConcentration?: boolean;
  regulatoryRisk?: boolean;

  // --- Narrativa / análisis ---
  executiveSummary: string;
  rankingReason: string;
  strengths: string[];
  risks: string[];
  catalystsToRise: string[];
  redFlagsToDiscard: string[];

  isMockData: boolean;
  /** Origen de los datos de ESTA empresa concreta. */
  dataStatus?: "real" | "partial" | "mock";
}

/** Origen global del conjunto de datos cargados. */
export type AsymmetryDataSource = "real" | "partial" | "mock";

/** Respuesta del backend / servicio de datos de asimetría. */
export interface AsymmetryDataResponse {
  source: AsymmetryDataSource;
  companies: AsymmetryCompany[];
  /** Aviso opcional sobre métricas faltantes. */
  note?: string;
  /** Fecha ISO de generación de la respuesta. */
  generatedAt?: string;
  /** ¿La respuesta proviene de la caché del backend? */
  cached?: boolean;
  /** Antigüedad de la caché del backend, en minutos. */
  cacheAgeMinutes?: number;
  /** Fecha ISO en la que la caché del backend caducará / se refrescará. */
  nextRefreshAt?: string;
}

/** Desglose del score por bloques (puntos ya ponderados). */
export interface AsymmetryScoreBreakdown {
  growth: number;
  margins: number;
  fcf: number;
  valuation: number;
  debt: number;
  drawdown: number;
  sector: number;
  momentum: number;
  total: number; // 0-100 redondeado
}

/** Resultado del cálculo de riesgo. */
export interface AsymmetryRiskResult {
  level: AsymmetryRiskLevel;
  points: number;
  /** Factores de riesgo estructurales clásicos (tamaño, deuda, sector...). */
  factors: string[];
  /** Factores de deterioro financiero reciente (crecimiento, márgenes...). */
  deteriorationFactors: string[];
}

/** Empresa procesada lista para mostrar. */
export interface ProcessedAsymmetryCompany extends AsymmetryCompany {
  score: number;
  breakdown: AsymmetryScoreBreakdown;
  riskLevel: AsymmetryRiskLevel;
  riskPoints: number;
  riskFactors: string[];
  deteriorationFactors: string[];
  signal: AsymmetrySignal;
}
