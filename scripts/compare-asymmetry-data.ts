/**
 * Comparador mock-vs-real del Radar de Asimetría.
 *
 * Carga la EODHD_API_KEY desde .env, trae los datos reales con el MISMO core
 * que usa el backend (sin exponer la key ni llamar desde el frontend), los
 * puntúa con las MISMAS funciones de scoring del proyecto y los compara con los
 * datos mock. No duplica lógica de scoring.
 *
 * Uso:   npm run compare:asymmetry
 */

import dotenv from "dotenv";
import { asymmetryMockData } from "../src/data/asymmetryMockData";
import { processAsymmetryCompanies } from "../src/logic/asymmetryEngine";
import { fetchAsymmetryFromEODHD } from "../src/server/eodhdAsymmetry";
import {
  ProcessedAsymmetryCompany,
  FcfStatus,
} from "../src/types/asymmetry";

dotenv.config();

// --- Utilidades de formato --------------------------------------------------

const pad = (v: unknown, w: number) => String(v ?? "").padEnd(w).slice(0, w);
const padL = (v: unknown, w: number) => String(v ?? "").padStart(w).slice(0, w);

/** Número opcional → texto, "N/D" si es null. */
const n = (v: number | null, digits = 0, suffix = "") =>
  v === null || v === undefined ? "N/D" : `${v.toFixed(digits)}${suffix}`;

const FCF_SHORT: Record<FcfStatus, string> = {
  positivo_creciente: "P.crec",
  positivo_irregular: "P.irr",
  negativo: "Neg",
};
const fcfShort = (v: FcfStatus | null) => (v === null ? "N/D" : FCF_SHORT[v]);

const STATUS_LABEL: Record<string, string> = {
  real: "REAL",
  partial: "PARCIAL",
  mock: "FALLBACK-MOCK",
};

const line = (len = 120) => console.log("─".repeat(len));

// --- Programa principal -----------------------------------------------------

async function main() {
  const apiKey = process.env.EODHD_API_KEY;

  if (!apiKey || apiKey.length < 8 || apiKey === "your_api_key_here") {
    console.log("\n⚠️  Falta EODHD_API_KEY en .env. Añádela para comparar datos reales.\n");
    console.log("   1) Crea o edita el archivo .env en la raíz del proyecto.");
    console.log("   2) Añade:  EODHD_API_KEY=tu_clave_real");
    console.log("   3) Vuelve a ejecutar:  npm run compare:asymmetry\n");
    process.exit(0);
  }

  console.log("\nConsultando EODHD con la clave configurada...\n");

  const response = await fetchAsymmetryFromEODHD(apiKey);
  const realByTicker = new Map(response.companies.map((c) => [c.ticker, c]));

  // Procesar con las MISMAS funciones de scoring del proyecto
  const mockProcessed = processAsymmetryCompanies(asymmetryMockData);
  const realProcessed = processAsymmetryCompanies(response.companies);
  const realProcByTicker = new Map(realProcessed.map((c) => [c.ticker, c]));

  interface Row {
    mock: ProcessedAsymmetryCompany;
    real: ProcessedAsymmetryCompany | undefined;
    status: string;
    delta: number;
  }

  const rows: Row[] = mockProcessed.map((mock) => {
    const real = realProcByTicker.get(mock.ticker);
    const raw = realByTicker.get(mock.ticker);
    const status = raw?.dataStatus || (real ? "real" : "missing");
    const delta = real ? real.score - mock.score : 0;
    return { mock, real, status, delta };
  });

  // Orden por mayor diferencia absoluta de score
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // === TABLA 1: scores, riesgo y señal ===
  console.log("COMPARACIÓN DE SCORE / RIESGO / SEÑAL (ordenado por |Δ| de score)");
  line(135);
  console.log(
    pad("Ticker", 8) + pad("Empresa", 24) + padL("ScMock", 7) + padL("ScReal", 7) +
    padL("Δ", 6) + "  " + pad("RiesgoMock", 11) + pad("RiesgoReal", 11) +
    pad("SeñalMock", 24) + pad("SeñalReal", 24) + pad("Estado", 14)
  );
  line(135);
  for (const { mock, real, status, delta } of rows) {
    console.log(
      pad(mock.ticker, 8) +
        pad(mock.name, 24) +
        padL(mock.score, 7) +
        padL(real ? real.score : "—", 7) +
        padL(real ? (delta > 0 ? `+${delta}` : `${delta}`) : "—", 6) +
        "  " +
        pad(mock.riskLevel, 11) +
        pad(real ? real.riskLevel : "—", 11) +
        pad(mock.signal, 24) +
        pad(real ? real.signal : "—", 24) +
        pad(STATUS_LABEL[status] || status, 14)
    );
  }
  line(135);

  // === TABLA 2: métricas con mayor diferencia ===
  console.log("\nMÉTRICAS CLAVE: mock → real");
  line(130);
  console.log(
    pad("Ticker", 8) +
      pad("Caída%", 16) +
      pad("Crec.%", 16) +
      pad("Margen%", 16) +
      pad("PER", 16) +
      pad("PEG", 16) +
      pad("Deuda/EBITDA", 18) +
      pad("FCF", 16)
  );
  line(130);
  const mr = (a: number | null, b: number | null | undefined, d = 0, s = "") =>
    `${n(a, d, s)} → ${b === undefined ? "—" : n(b, d, s)}`;
  for (const { mock, real } of rows) {
    console.log(
      pad(mock.ticker, 8) +
        pad(mr(mock.drawdownFrom52wHigh, real?.drawdownFrom52wHigh), 16) +
        pad(mr(mock.revenueGrowth, real?.revenueGrowth), 16) +
        pad(mr(mock.operatingMargin, real?.operatingMargin), 16) +
        pad(mr(mock.per, real?.per), 16) +
        pad(mr(mock.peg, real?.peg, 1), 16) +
        pad(mr(mock.netDebtToEbitda, real?.netDebtToEbitda, 1), 18) +
        pad(`${fcfShort(mock.fcf)} → ${real ? fcfShort(real.fcf) : "—"}`, 16)
    );
  }
  line(130);

  // === RESUMEN FINAL ===
  const withReal = rows.filter((r) => r.real);
  const avg = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

  const avgMock = avg(rows.map((r) => r.mock.score));
  const avgReal = avg(withReal.map((r) => r.real!.score));
  const avgDelta = avg(withReal.map((r) => r.delta));
  const up10 = withReal.filter((r) => r.delta > 10);
  const down10 = withReal.filter((r) => r.delta < -10);
  const signalChanges = withReal.filter((r) => r.real!.signal !== r.mock.signal);
  const partial = rows.filter((r) => r.status === "partial");
  const fallback = rows.filter((r) => r.status === "mock");

  console.log("\nRESUMEN");
  line(60);
  console.log(`Origen global del conjunto : ${response.source.toUpperCase()}`);
  console.log(`Empresas comparadas        : ${rows.length}`);
  console.log(`Score medio MOCK           : ${avgMock}`);
  console.log(`Score medio REAL           : ${avgReal}`);
  console.log(`Diferencia media (Δ)       : ${avgDelta > 0 ? "+" : ""}${avgDelta}`);
  console.log(`Suben > 10 pts             : ${up10.length}${up10.length ? "  (" + up10.map((r) => r.mock.ticker).join(", ") + ")" : ""}`);
  console.log(`Bajan > 10 pts             : ${down10.length}${down10.length ? "  (" + down10.map((r) => r.mock.ticker).join(", ") + ")" : ""}`);
  console.log(`Cambian de señal           : ${signalChanges.length}${signalChanges.length ? "  (" + signalChanges.map((r) => `${r.mock.ticker}: ${r.mock.signal}→${r.real!.signal}`).join("; ") + ")" : ""}`);
  console.log(`Datos reales PARCIALES     : ${partial.length}${partial.length ? "  (" + partial.map((r) => r.mock.ticker).join(", ") + ")" : ""}`);
  console.log(`Fallback a MOCK (fallo API): ${fallback.length}${fallback.length ? "  (" + fallback.map((r) => r.mock.ticker).join(", ") + ")" : ""}`);
  line(60);
  if (response.note) console.log(`Nota: ${response.note}`);
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ Error ejecutando la comparación:", err?.message || err, "\n");
  process.exit(1);
});
