/**
 * Radar de Asimetría Positiva - Motor de puntuación
 *
 * Lógica pura y aislada del componente visual. Calcula:
 *   - calculateAsymmetryScore(company): score 0-100 + desglose por bloques
 *   - calculateRiskLevel(company): nivel de riesgo independiente
 *   - getSignalFromScore(score): señal cualitativa
 *
 * IMPORTANTE: esto NO es una recomendación de compra. Es una herramienta
 * de análisis orientativa con fines educativos.
 */

import {
  AsymmetryCompany,
  AsymmetryScoreBreakdown,
  AsymmetryRiskResult,
  AsymmetryRiskLevel,
  AsymmetrySignal,
} from "../types/asymmetry";

/**
 * Pesos máximos por bloque (suman 100).
 *
 * --- CÓMO CAMBIAR LOS PESOS DEL SCORE ---
 * Modifica los valores de este objeto. Cada bloque calcula internamente una
 * proporción 0-1 y la multiplica por su peso, así que puedes subir/bajar la
 * importancia de cualquier bloque sin tocar la lógica. Lo ideal es que sigan
 * sumando 100 para mantener la escala 0-100, pero no es obligatorio: el total
 * se redondea al final. Por ejemplo, para dar más peso al crecimiento:
 *     growth: 25, valuation: 10
 */
export const ASYMMETRY_WEIGHTS = {
  growth: 20,
  margins: 15,
  fcf: 15,
  valuation: 15,
  debt: 10,
  drawdown: 10,
  sector: 10,
  momentum: 5,
} as const;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * Proporción asignada a un bloque cuando falta el dato necesario.
 * Es una "penalización suave": no da el máximo (no premia la opacidad) pero
 * tampoco hunde a la empresa con un 0. Equivale a ~30% de los puntos del bloque.
 */
export const NULL_RATIO = 0.3;

// --- A) Crecimiento (proporción 0-1) ---
function ratioGrowth(c: AsymmetryCompany): number {
  if (c.revenueGrowth === null) return NULL_RATIO;
  if (c.revenueGrowth > 20) return 1; // 20 pts
  if (c.revenueGrowth >= 10) return 0.75; // 15 pts
  if (c.revenueGrowth >= 5) return 0.4; // 8 pts
  return 0;
}

// --- B) Márgenes ---
function ratioMargins(c: AsymmetryCompany): number {
  // Sin tendencia ni margen no podemos evaluar el bloque.
  if (c.marginTrend === null && c.operatingMargin === null) return NULL_RATIO;
  if (c.marginTrend === "deteriorando") return 0;
  if (c.operatingMargin !== null) {
    if (c.marginTrend === "creciente" && c.operatingMargin > 20) return 1; // 15 pts
    if (c.marginTrend === "estable" && c.operatingMargin >= 10 && c.operatingMargin <= 20)
      return 0.667; // 10 pts
  }
  if (c.marginTrend === "mejorando") return 0.333; // 5 pts (bajo pero mejorando)
  // Fallbacks razonables para combinaciones no explícitas:
  if (c.operatingMargin === null) return NULL_RATIO;
  if (c.operatingMargin > 20) return 0.8;
  if (c.operatingMargin >= 10) return 0.533;
  return 0.2;
}

// --- C) Flujo de caja libre ---
function ratioFcf(c: AsymmetryCompany): number {
  if (c.fcf === null) return NULL_RATIO;
  if (c.fcf === "positivo_creciente") return 1; // 15 pts
  if (c.fcf === "positivo_irregular") return 0.533; // 8 pts
  return 0; // negativo
}

// --- D) Valoración (PEG) ---
function ratioValuation(c: AsymmetryCompany): number {
  if (c.peg === null) return NULL_RATIO;
  if (c.peg <= 1.5) return 1; // 15 pts
  if (c.peg <= 2) return 0.533; // 8 pts
  return 0; // PEG > 2 o valoración muy exigente
}

// --- E) Deuda (Deuda neta / EBITDA) ---
function ratioDebt(c: AsymmetryCompany): number {
  if (c.netDebtToEbitda === null) return NULL_RATIO;
  if (c.netDebtToEbitda < 1) return 1; // 10 pts
  if (c.netDebtToEbitda <= 2.5) return 0.6; // 6 pts
  if (c.netDebtToEbitda <= 4) return 0.3; // 3 pts
  return 0; // > 4
}

// --- F) Caída desde máximos ---
function ratioDrawdown(c: AsymmetryCompany): number {
  if (c.drawdownFrom52wHigh === null) return NULL_RATIO;
  const d = c.drawdownFrom52wHigh;
  if (d >= 30 && d <= 60) return 1; // 10 pts (zona dulce de castigo)
  if (d >= 15 && d < 30) return 0.6; // 6 pts
  if (d > 60) return 0.4; // 4 pts (posible deterioro serio)
  return 0.2; // < 15% → 2 pts
}

// --- G) Sector con viento de cola ---
function ratioSector(c: AsymmetryCompany): number {
  if (c.sectorCategory === "favorecido") return 1; // 10 pts
  if (c.sectorCategory === "neutro") return 0.5; // 5 pts
  return 0; // deterioro estructural
}

// --- H) Momentum reciente ---
function ratioMomentum(c: AsymmetryCompany): number {
  if (c.momentumState === null) return NULL_RATIO;
  if (c.momentumState === "recuperando" && c.aboveMA50) return 1; // 5 pts
  if (c.momentumState === "lateral") return 0.4; // 2 pts
  return 0; // bajista fuerte
}

/**
 * Calcula el Score de Asimetría (0-100) y su desglose por bloques.
 * Cada bloque = proporción(0-1) * peso configurable.
 */
export function calculateAsymmetryScore(c: AsymmetryCompany): AsymmetryScoreBreakdown {
  const growth = clamp01(ratioGrowth(c)) * ASYMMETRY_WEIGHTS.growth;
  const margins = clamp01(ratioMargins(c)) * ASYMMETRY_WEIGHTS.margins;
  const fcf = clamp01(ratioFcf(c)) * ASYMMETRY_WEIGHTS.fcf;
  const valuation = clamp01(ratioValuation(c)) * ASYMMETRY_WEIGHTS.valuation;
  const debt = clamp01(ratioDebt(c)) * ASYMMETRY_WEIGHTS.debt;
  const drawdown = clamp01(ratioDrawdown(c)) * ASYMMETRY_WEIGHTS.drawdown;
  const sector = clamp01(ratioSector(c)) * ASYMMETRY_WEIGHTS.sector;
  const momentum = clamp01(ratioMomentum(c)) * ASYMMETRY_WEIGHTS.momentum;

  const round = (n: number) => Math.round(n);
  const total = round(growth + margins + fcf + valuation + debt + drawdown + sector + momentum);

  return {
    growth: round(growth),
    margins: round(margins),
    fcf: round(fcf),
    valuation: round(valuation),
    debt: round(debt),
    drawdown: round(drawdown),
    sector: round(sector),
    momentum: round(momentum),
    total: Math.max(0, Math.min(100, total)),
  };
}

/** Umbral de capitalización (millones) por debajo del cual se considera small cap. */
export const SMALL_CAP_THRESHOLD = 4000;

/**
 * Tope de puntos de riesgo que puede aportar el "deterioro financiero reciente".
 * Sirve para que el deterioro NO duplique en exceso el castigo que ya aplica el
 * score: por sí solo puede sacar a una empresa de "Riesgo Bajo" (hasta Medio),
 * pero no llevarla a niveles altos. Para Alto/Muy alto siguen pesando los
 * factores estructurales clásicos.
 */
export const DETERIORATION_RISK_CAP = 2;

/**
 * Calcula un nivel de riesgo independiente del score de asimetría.
 * Cuantos más factores de riesgo acumula, mayor es el nivel.
 */
export function calculateRiskLevel(c: AsymmetryCompany): AsymmetryRiskResult {
  let points = 0;
  const factors: string[] = [];

  if (c.marketCap !== null && c.marketCap < SMALL_CAP_THRESHOLD) {
    points += 2;
    factors.push("Empresa pequeña (small cap)");
  }
  if (c.isEmergingMarket) {
    points += 2;
    factors.push("China / mercados emergentes");
  }
  if (c.netDebtToEbitda !== null && c.netDebtToEbitda > 4) {
    points += 2;
    factors.push("Alta deuda (Deuda/EBITDA > 4)");
  } else if (c.netDebtToEbitda !== null && c.netDebtToEbitda > 2.5) {
    points += 1;
    factors.push("Deuda elevada (Deuda/EBITDA > 2,5)");
  }
  if (c.fcf === "negativo") {
    points += 2;
    factors.push("Flujo de caja libre negativo");
  }
  if (c.isCyclical) {
    points += 1;
    factors.push("Sector cíclico");
  }
  if (c.highVolatility) {
    points += 2;
    factors.push("Volatilidad alta");
  }
  if (c.customerConcentration) {
    points += 1;
    factors.push("Dependencia de pocos clientes");
  }
  if (c.regulatoryRisk) {
    points += 1;
    factors.push("Riesgo regulatorio");
  }
  if (c.drawdownFrom52wHigh !== null && c.drawdownFrom52wHigh > 60) {
    points += 1;
    factors.push("Caída muy pronunciada desde máximos (posible deterioro)");
  }

  // --- Deterioro financiero reciente ---
  // Condiciones atómicas reutilizadas tanto para puntuar como para explicar.
  // Un dato ausente (null) NO activa la condición: no penalizamos lo desconocido.
  const weakGrowth = c.revenueGrowth !== null && c.revenueGrowth < 3;
  const marginDeclining = c.marginTrend === "deteriorando";
  const fcfNotStrong = c.fcf === "positivo_irregular" || c.fcf === "negativo";
  const expensiveVsGrowth = c.peg !== null && c.peg > 2.5;
  const bigDrawdownWithDamage =
    c.drawdownFrom52wHigh !== null &&
    c.drawdownFrom52wHigh > 50 &&
    (marginDeclining || weakGrowth);

  let deterioration = 0;
  if (weakGrowth && marginDeclining) deterioration += 1; // 1
  if (weakGrowth && expensiveVsGrowth) deterioration += 1; // 2
  if (marginDeclining && fcfNotStrong) deterioration += 1; // 3
  if (bigDrawdownWithDamage) deterioration += 1; // 4

  // Limitar la aportación del deterioro para no sobrecastigar (ver constante).
  deterioration = Math.min(deterioration, DETERIORATION_RISK_CAP);
  points += deterioration;

  // Frases sencillas para explicar el deterioro en el modal de detalle.
  const deteriorationFactors: string[] = [];
  if (weakGrowth) deteriorationFactors.push("Crecimiento de ingresos débil.");
  if (marginDeclining) deteriorationFactors.push("Márgenes en deterioro.");
  if (expensiveVsGrowth)
    deteriorationFactors.push("Valoración exigente frente al crecimiento.");
  if (bigDrawdownWithDamage)
    deteriorationFactors.push("Caída fuerte acompañada de deterioro operativo.");

  let level: AsymmetryRiskLevel;
  if (points <= 1) level = "Bajo";
  else if (points <= 3) level = "Medio";
  else if (points <= 5) level = "Alto";
  else level = "Muy alto";

  return { level, points, factors, deteriorationFactors };
}

/**
 * Traduce el score 0-100 en una señal cualitativa.
 * Usa las etiquetas de la columna "Señal" del radar sobre los tramos definidos.
 */
export function getSignalFromScore(score: number): AsymmetrySignal {
  if (score >= 85) return "Oportunidad excepcional";
  if (score >= 70) return "Muy interesante";
  if (score >= 55) return "Interesante";
  if (score >= 40) return "Vigilar";
  return "Descartar";
}

/** Procesa una empresa: score + riesgo + señal en un único objeto. */
export function processAsymmetryCompany(c: AsymmetryCompany) {
  const breakdown = calculateAsymmetryScore(c);
  const risk = calculateRiskLevel(c);
  const signal = getSignalFromScore(breakdown.total);

  return {
    ...c,
    score: breakdown.total,
    breakdown,
    riskLevel: risk.level,
    riskPoints: risk.points,
    riskFactors: risk.factors,
    deteriorationFactors: risk.deteriorationFactors,
    signal,
  };
}

/** Procesa y ordena un listado completo por score descendente. */
export function processAsymmetryCompanies(companies: AsymmetryCompany[]) {
  return companies
    .map(processAsymmetryCompany)
    .sort((a, b) => b.score - a.score);
}

/** Mapeo numérico del nivel de riesgo para comparaciones en filtros. */
export const RISK_ORDER: Record<AsymmetryRiskLevel, number> = {
  Bajo: 1,
  Medio: 2,
  Alto: 3,
  "Muy alto": 4,
};
