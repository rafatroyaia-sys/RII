// Netlify Function: /api/asymmetry/companies → datos reales de EODHD (con caché)
// La API key (EODHD_API_KEY) se lee del entorno del servidor y NUNCA se expone
// al cliente. La respuesta normalizada se cachea 12 h en el backend para
// proteger la cuota de EODHD. Si no hay key o falla, se responde de forma
// controlada para que el frontend use sus datos mock como fallback.

import { getAsymmetryCompaniesCached, ASYMMETRY_CACHE_TTL_MS } from "../../src/server/asymmetryCache";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

// Caché de CDN (segunda capa, sobrevive a cold starts de la función).
// 12 h, con stale-while-revalidate de 24 h.
const CDN_CACHE = {
  "Cache-Control": `public, max-age=${ASYMMETRY_CACHE_TTL_MS / 1000}, stale-while-revalidate=86400`,
};
const NO_CACHE = { "Cache-Control": "no-store" };

export const handler = async (event: any) => {
  const force = event?.queryStringParameters?.force === "true";
  const apiKey = process.env.EODHD_API_KEY;

  // Sin API key → respuesta controlada; el frontend usará mock.
  if (!apiKey || apiKey.length < 8 || apiKey === "your_api_key_here") {
    return {
      statusCode: 200,
      headers: { ...CORS, ...NO_CACHE },
      body: JSON.stringify({
        source: "mock",
        companies: [],
        note: "EODHD_API_KEY no configurada en el servidor; usando datos mock.",
      }),
    };
  }

  try {
    const data = await getAsymmetryCompaniesCached(apiKey, force);
    // En force no dejamos que el CDN sirva una versión vieja; en normal sí cacheamos.
    const headers = { ...CORS, ...(force ? NO_CACHE : CDN_CACHE) };
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (error: any) {
    return {
      statusCode: 200,
      headers: { ...CORS, ...NO_CACHE },
      body: JSON.stringify({
        source: "mock",
        companies: [],
        note: `Error al consultar EODHD: ${error?.message || "desconocido"}. Usando datos mock.`,
      }),
    };
  }
};
