// Netlify Function: /api/fred → FRED (Federal Reserve) macro data
exports.handler = async (event) => {
  const seriesId = event.queryStringParameters?.seriesId;
  const requestedLimit = Number(event.queryStringParameters?.limit || 1);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.round(requestedLimit), 1), 60) : 1;
  const apiKey = process.env.FRED_API_KEY;

  if (!seriesId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, provider: "FRED", reason: "seriesId es obligatorio" }),
    };
  }

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, provider: "FRED", seriesId, detectedIssue: "missing_key", reason: "FRED_API_KEY no configurada en el servidor" }),
    };
  }

  if (apiKey.length < 10) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, provider: "FRED", seriesId, detectedIssue: "invalid_key", reason: "FRED_API_KEY parece ser inválida" }),
    };
  }

  try {
    const encodedSeriesId = encodeURIComponent(seriesId);
    const encodedApiKey = encodeURIComponent(apiKey);
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodedSeriesId}&api_key=${encodedApiKey}&file_type=json&sort_order=desc&limit=${limit}`;
    const response = await fetch(url);

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return {
        statusCode: response.status >= 400 ? response.status : 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          ok: false,
          provider: "FRED",
          seriesId,
          detectedIssue: "unexpected_payload",
          status: response.status,
          statusText: response.statusText,
          bodyPreview: text.substring(0, 300),
          reason: `FRED devolvió un formato no válido: ${response.statusText}`,
        }),
      };
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          ok: false,
          provider: "FRED",
          seriesId,
          detectedIssue: "fred_http_error",
          reason: data.error_message || `Error de FRED: ${response.statusText}`,
        }),
      };
    }

    const validObservations = (data.observations || [])
      .map((observation) => ({
        date: observation.date,
        value: parseFloat(observation.value),
      }))
      .filter((observation) => Number.isFinite(observation.value));

    if (validObservations.length > 0) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          ok: true,
          provider: "FRED",
          seriesId,
          value: validObservations[0].value,
          date: validObservations[0].date,
          observations: validObservations,
          rawStatus: "real",
        }),
      };
    }

    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, provider: "FRED", seriesId, reason: "No se encontraron observaciones" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, provider: "FRED", seriesId, detectedIssue: "network_error", reason: "Error de red al conectar con FRED backend" }),
    };
  }
};
