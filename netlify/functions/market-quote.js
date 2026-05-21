// Netlify Function: /api/market/quote → Yahoo Finance realtime quote
exports.handler = async (event) => {
  const symbol = event.queryStringParameters?.symbol;

  if (!symbol) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, provider: "Yahoo Finance", reason: "symbol es obligatorio" }),
    };
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const response = await fetch(url);

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: false, provider: "Yahoo Finance", symbol, reason: `Error Yahoo Finance: ${response.statusText}` }),
      };
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: false, provider: "Yahoo Finance", symbol, reason: "Símbolo no encontrado." }),
      };
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose || meta.previousClose;
    let changePercent = 0;
    if (price && previousClose) {
      changePercent = ((price - previousClose) / previousClose) * 100;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        ok: true,
        provider: "Yahoo Finance",
        symbol,
        price,
        changePercent,
        currency: meta.currency || "USD",
        lastUpdated: new Date().toISOString(),
        rawStatus: "real",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, provider: "Yahoo Finance", symbol, reason: "Error de conexión interna Yahoo Finance" }),
    };
  }
};
