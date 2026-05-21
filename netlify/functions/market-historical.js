// Netlify Function: /api/market/historical → Yahoo Finance 1-year historical data
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
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
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

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const closePrices = quote.close || [];
    const highs = quote.high || [];
    const lows = quote.low || [];

    const validIndexes = closePrices
      .map((c, i) => (c !== null ? i : -1))
      .filter((i) => i !== -1);

    if (validIndexes.length < 5) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: false, provider: "Yahoo Finance", symbol, reason: "Histórico insuficiente" }),
      };
    }

    const getValidPrice = (targetIndexFromEnd) => {
      let idx = validIndexes.length - 1 - targetIndexFromEnd;
      if (idx < 0) idx = 0;
      return closePrices[validIndexes[idx]];
    };

    const currentPrice = getValidPrice(0);
    const oneMonthAgoPrice = getValidPrice(21);
    const threeMonthAgoPrice = getValidPrice(63);
    const oneYearAgoPrice = getValidPrice(validIndexes.length - 1);

    let high52 = -Infinity;
    let low52 = Infinity;
    for (const idx of validIndexes) {
      const h = highs[idx];
      const l = lows[idx];
      if (h !== null && h > high52) high52 = h;
      if (l !== null && l < low52) low52 = l;
    }
    if (high52 === -Infinity) high52 = 0;
    if (low52 === Infinity) low52 = 0;

    const calcChange = (current, past) => (past !== 0 ? ((current - past) / past) * 100 : 0);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        ok: true,
        provider: "Yahoo Finance",
        symbol,
        oneMonthChangePercent: calcChange(currentPrice, oneMonthAgoPrice),
        threeMonthChangePercent: calcChange(currentPrice, threeMonthAgoPrice),
        oneYearChangePercent: calcChange(currentPrice, oneYearAgoPrice),
        fiftyTwoWeekHigh: high52,
        fiftyTwoWeekLow: low52,
        historicalPoints: validIndexes.length,
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
