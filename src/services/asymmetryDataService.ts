/**
 * Servicio de datos del Radar de Asimetría (frontend).
 *
 * Llama al backend interno (Netlify Function vía /api/asymmetry/companies) que
 * normaliza los datos de EODHD. La API key vive solo en el servidor.
 *
 * - Cachea la respuesta en localStorage durante 12 horas para no consumir
 *   llamadas de API innecesarias.
 * - Si la llamada falla, no hay datos o no hay API key, devuelve los datos mock
 *   como fallback (source: "mock").
 */

import { asymmetryMockData } from "../data/asymmetryMockData";
import { AsymmetryCompany, AsymmetryDataResponse } from "../types/asymmetry";

const API_BASE_URL = ((import.meta as any).env?.VITE_BACKEND_API_BASE_URL || "").replace(/\/$/, "");
const ENDPOINT = `${API_BASE_URL}/api/asymmetry/companies`;

export const ASYMMETRY_CACHE_KEY = "rii_asymmetry_companies_cache";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

interface CacheEntry {
  timestamp: number;
  data: AsymmetryDataResponse;
}

/** Resultado siempre con datos utilizables (reales o mock). */
export interface AsymmetryFetchResult extends AsymmetryDataResponse {
  /** ¿Provienen estos datos de la caché de localStorage? */
  fromCache: boolean;
}

function mockResponse(note?: string): AsymmetryDataResponse {
  return {
    source: "mock",
    companies: asymmetryMockData,
    note,
    generatedAt: new Date().toISOString(),
  };
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(ASYMMETRY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.timestamp || !parsed?.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: AsymmetryDataResponse): void {
  try {
    localStorage.setItem(
      ASYMMETRY_CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), data } satisfies CacheEntry)
    );
  } catch {
    /* localStorage lleno o no disponible: ignorar */
  }
}

/**
 * Obtiene las empresas del Radar de Asimetría.
 * @param forceRefresh si es true, ignora la caché y vuelve a llamar al backend.
 */
export async function fetchAsymmetryCompanies(
  forceRefresh = false
): Promise<AsymmetryFetchResult> {
  // 1) Caché válida (< 12h) salvo refresco forzado
  if (!forceRefresh) {
    const cached = readCache();
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { ...cached.data, fromCache: true };
    }
  }

  // 2) Intentar datos reales desde el backend (force → ?force=true, evita la caché de backend)
  try {
    const url = forceRefresh ? `${ENDPOINT}?force=true` : ENDPOINT;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as AsymmetryDataResponse;
      // Backend sin datos reales (sin key / error) → mock
      if (!data || !Array.isArray(data.companies) || data.companies.length === 0) {
        return { ...mockResponse(data?.note), fromCache: false };
      }
      writeCache(data);
      return { ...data, fromCache: false };
    }
  } catch {
    /* sin conexión / proxy caído → fallback */
  }

  // 3) Fallback final: mock
  return { ...mockResponse("No se pudo contactar con el backend; usando datos mock."), fromCache: false };
}

/** Devuelve el ticker de la empresa AsymmetryCompany (utilidad menor). */
export function getMockCompanies(): AsymmetryCompany[] {
  return asymmetryMockData;
}
