// Netlify Function: /api/fred/diagnostic → FRED connectivity & key test
exports.handler = async (event) => {
  const seriesId = event.queryStringParameters?.seriesId || "FEDFUNDS";
  const apiKey = process.env.FRED_API_KEY;

  const result = {
    ok: false,
    provider: "FRED",
    seriesId,
    apiKeyPresent: !!apiKey,
    apiKeyLooksValid: !!apiKey && apiKey.length >= 10,
    detectedIssue: "none",
    httpStatus: null,
    message: "Diagnostic init",
    rawKeysReceived: [],
  };

  if (!result.apiKeyPresent) {
    result.detectedIssue = "missing_key";
    result.message = "La clave FRED_API_KEY no está configurada en las variables de entorno de Netlify.";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result),
    };
  }

  if (!result.apiKeyLooksValid) {
    result.detectedIssue = "invalid_key";
    result.message = "La clave FRED_API_KEY parece demasiado corta para ser válida.";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result),
    };
  }

  try {
    const encodedSeriesId = encodeURIComponent(seriesId);
    const encodedApiKey = encodeURIComponent(apiKey);
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodedSeriesId}&api_key=${encodedApiKey}&file_type=json&sort_order=desc&limit=1`;

    const response = await fetch(url);
    result.httpStatus = response.status;
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
      result.rawKeysReceived = Object.keys(data);
    } catch (e) {
      result.detectedIssue = "unexpected_payload";
      result.message = "FRED devolvió contenido que no es JSON.";
      result.bodyPreview = text.substring(0, 300);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(result),
      };
    }

    if (!response.ok) {
      result.detectedIssue = "provider_error";
      result.message = data.error_message || `FRED respondió con estado HTTP ${response.status} ${response.statusText}`;
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(result),
      };
    }

    if (data.observations) {
      result.ok = true;
      result.detectedIssue = "real";
      result.message = "La conexión con FRED funciona correctamente y ha devuelto observaciones.";
    } else {
      result.detectedIssue = "unexpected_payload";
      result.message = "FRED devolvió JSON válido pero sin la propiedad 'observations'.";
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result),
    };
  } catch (error) {
    result.detectedIssue = "network_error";
    result.message = `Error de red contactando a FRED: ${error.message}`;
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result),
    };
  }
};
