// ARCHIVO PREPARADO PARA MIGRACIÓN A BACKEND (Netlify Functions, Vercel Functions, Cloudflare Workers, Express, etc.)
// Actualmente, como requerimos evitar la exposición de API Keys y evitar errores de CORS con FRED,
// los clientes frontend deberían utilizar este tipo de proxy para recolectar sus datos.

const API_BASE_URL = ((import.meta as any).env?.VITE_BACKEND_API_BASE_URL || "").replace(/\/$/, "");

export async function fetchMarketDiagnosticViaProxy(symbol: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market/diagnostic?symbol=${symbol}`);
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, reason: 'No se pudo conectar con el proxy backend de diagnóstico de mercado' };
  }
}

export async function fetchFredDiagnosticViaProxy(seriesId: string = "FEDFUNDS") {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fred/diagnostic?seriesId=${seriesId}`);
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, reason: 'No se pudo conectar con el proxy backend de diagnóstico de FRED' };
  }
}

export async function fetchFredSeriesViaProxy(seriesId: string, limit: number = 1) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fred?seriesId=${seriesId}&limit=${limit}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { ok: false, reason: err.reason || err.error || (response.status === 404 ? 'No encontrado' : `Error del proxy: ${response.statusText}`) };
    }
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, reason: 'No se pudo conectar con el proxy backend de FRED' };
  }
}

export async function fetchMarketQuoteViaProxy(symbol: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market/quote?symbol=${symbol}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { ok: false, reason: err.reason || err.error || (response.status === 404 ? 'No encontrado' : `Error del proxy: ${response.statusText}`) };
    }
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, reason: 'No se pudo conectar con el proxy backend de mercado' };
  }
}

export async function fetchMarketHistoricalViaProxy(symbol: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market/historical?symbol=${symbol}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { ok: false, reason: err.reason || err.error || (response.status === 404 ? 'No encontrado' : `Error del proxy: ${response.statusText}`) };
    }
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, reason: 'No se pudo conectar con el proxy backend histórico de mercado' };
  }
}
