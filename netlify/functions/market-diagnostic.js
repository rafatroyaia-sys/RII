// Netlify Function: /api/market/diagnostic → Yahoo Finance connectivity test
exports.handler = async (event) => {
  const symbol = event.queryStringParameters?.symbol || "MSFT";

  const result = {
    ok: false,
    provider: "Yahoo Finance",
    symbol,
    detectedIssue: "none",
    message: "Operación completada.",
    rawKeysReceived: [],
  };

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const response = await fetch(url);

    if (!response.ok) {
      result.detectedIssue = "provider_error";
      result.message = `Fallo HTTP desde Yahoo Finance (Status: ${response.status})`;
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(result),
      };
    }

    const data = await response.json();
    result.rawKeysReceived = Object.keys(data);

    const chartResult = data.chart?.result?.[0];
    if (chartResult) {
      result.ok = true;
      result.message = "Conexión exitosa, quote obtenido.";
    } else if (data.chart?.error) {
      result.detectedIssue = "missing_symbol";
      result.message = `Símbolo no disponible: ${data.chart.error?.description || "Error desconocido"}`;
    } else {
      result.detectedIssue = "unexpected_payload";
      result.message = "Respuesta inesperada de Yahoo Finance.";
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result),
    };
  } catch (error) {
    result.detectedIssue = "network_error";
    result.message = `Error de red al intentar contactar a Yahoo Finance: ${error.message}`;
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result),
    };
  }
};
