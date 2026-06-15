/**
 * Caché de backend para el Radar de Asimetría.
 *
 * Protege la cuota de EODHD (plan gratuito: 20 llamadas/día). En lugar de que
 * cada visitante dispare ~12 llamadas, el backend cachea la respuesta YA
 * NORMALIZADA durante 12 horas y la sirve a todos.
 *
 * NUNCA se cachea ni se guarda la API key: solo el JSON normalizado de empresas.
 *
 * Estrategia de caché (ver punto 7 del encargo):
 *  1) MEMORIA GLOBAL del proceso (esta implementación). Funciona perfecto en el
 *     servidor local (proceso de larga vida) y dentro de una instancia "caliente"
 *     de Netlify. Puede resetearse en cold starts de funciones serverless.
 *  2) Como segunda capa, la Netlify Function añade cabeceras Cache-Control para
 *     que el CDN cachee la respuesta entre cold starts.
 *
 * TODO (futuro): para una caché 100% fiable entre instancias/cold starts,
 * sustituir/complementar la memoria por **Netlify Blobs** o **Supabase**:
 *   - Netlify Blobs: import { getStore } from "@netlify/blobs"
 *   - Supabase: tabla (key, json, updated_at) con upsert y lectura por TTL.
 */

import type { AsymmetryDataResponse } from "../types/asymmetry";
import { fetchAsymmetryFromEODHD } from "./eodhdAsymmetry";

export const ASYMMETRY_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

interface CacheEntry {
  data: AsymmetryDataResponse;
  timestamp: number;
}

// Memoria global del proceso (no contiene la API key, solo el JSON normalizado).
let memoryCache: CacheEntry | null = null;

function withMeta(
  data: AsymmetryDataResponse,
  timestamp: number,
  cached: boolean
): AsymmetryDataResponse {
  const now = Date.now();
  return {
    ...data,
    cached,
    cacheAgeMinutes: Math.max(0, Math.round((now - timestamp) / 60000)),
    nextRefreshAt: new Date(timestamp + ASYMMETRY_CACHE_TTL_MS).toISOString(),
  };
}

/**
 * Devuelve las empresas usando la caché de backend.
 * @param apiKey clave de EODHD (no se almacena).
 * @param force  si es true, ignora la caché y vuelve a llamar a EODHD.
 */
export async function getAsymmetryCompaniesCached(
  apiKey: string,
  force = false
): Promise<AsymmetryDataResponse> {
  const now = Date.now();

  // 1) Caché válida (< TTL) y sin forzar → servir cacheado
  if (!force && memoryCache && now - memoryCache.timestamp < ASYMMETRY_CACHE_TTL_MS) {
    return withMeta(memoryCache.data, memoryCache.timestamp, true);
  }

  // 2) Llamar a EODHD
  const fresh = await fetchAsymmetryFromEODHD(apiKey);

  // Solo cacheamos respuestas con datos reales/parciales. Si EODHD falla y todo
  // cae a mock (p. ej. rate limit), NO lo cacheamos para reintentar más tarde...
  if (fresh.source !== "mock") {
    memoryCache = { data: fresh, timestamp: now };
    return withMeta(fresh, now, false);
  }

  // ...y, si tenemos una caché anterior buena, la servimos en vez del mock.
  if (memoryCache) {
    return withMeta(memoryCache.data, memoryCache.timestamp, true);
  }

  // Sin caché previa: devolver el resultado mock (no cacheado).
  return withMeta(fresh, now, false);
}

/** Limpia la caché en memoria (útil para pruebas). */
export function clearAsymmetryCache(): void {
  memoryCache = null;
}
