import React, { useMemo, useState } from "react";
import { Radar, Search, Loader2, AlertTriangle, TrendingDown, Zap } from "lucide-react";
import { fetchMarketHistoricalViaProxy, fetchMarketQuoteViaProxy } from "../../services/backendProxyClient";
import { Badge } from "../ui/Badge";

interface AnomalyCandidate {
  symbol: string;
  price: number | null;
  currency: string;
  drawdown52w: number | null;
  change1m: number | null;
  change3m: number | null;
  change1y: number | null;
  score: number;
  signal: string;
  reason: string;
}

const PRESET_SYMBOLS = [
  "MSFT",
  "AAPL",
  "NVDA",
  "AMZN",
  "GOOGL",
  "META",
  "TSLA",
  "ADBE",
  "CRM",
  "AMD",
  "ASML",
  "NVO",
  "UNH",
  "NKE",
  "DIS",
  "PYPL",
  "SHOP",
  "SNOW",
  "RBLX",
  "SE",
  "MELI",
  "ADYEN.AS",
  "PUIG.MC",
  "ROVI.MC",
  "LSEG.L",
  "BFIT.AS",
  "TSM",
  "PLTR",
  "CRWD",
  "NET",
];

function parseSymbols(raw: string) {
  return [...new Set(raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
  )].slice(0, 40);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function calculateAnomalyScore(candidate: Omit<AnomalyCandidate, "score" | "signal" | "reason">) {
  const drawdown = candidate.drawdown52w;
  const change1m = candidate.change1m;
  const change3m = candidate.change3m;
  const change1y = candidate.change1y;

  let score = 0;
  const reasons: string[] = [];

  if (drawdown !== null) {
    if (drawdown >= 25 && drawdown <= 60) {
      score += 38;
      reasons.push("castigo relevante desde maximos");
    } else if (drawdown > 60) {
      score += 18;
      reasons.push("caida extrema, revisar deterioro");
    } else if (drawdown >= 12) {
      score += 18;
      reasons.push("correccion moderada");
    }
  }

  if (change1m !== null) {
    if (change1m > 8) {
      score += 22;
      reasons.push("rebote mensual fuerte");
    } else if (change1m > 0) {
      score += 12;
      reasons.push("rebote mensual positivo");
    } else if (change1m < -12) {
      score -= 8;
      reasons.push("presion bajista reciente");
    }
  }

  if (change3m !== null) {
    if (change3m > 12) {
      score += 24;
      reasons.push("recuperacion trimestral clara");
    } else if (change3m > 0) {
      score += 12;
      reasons.push("momentum trimestral positivo");
    } else if (change3m < -20) {
      score -= 10;
      reasons.push("momentum trimestral debil");
    }
  }

  if (change1y !== null) {
    if (change1y < -20 && change1m !== null && change1m > 0) {
      score += 12;
      reasons.push("posible giro tras un ano dificil");
    } else if (change1y > 80) {
      score -= 8;
      reasons.push("ya viene muy extendida");
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const signal =
    score >= 75 ? "Anomalia fuerte" :
    score >= 55 ? "Vigilar de cerca" :
    score >= 35 ? "Interesante" :
    "Sin senal clara";

  return {
    score,
    signal,
    reason: reasons.length ? reasons.join(" · ") : "sin patron tecnico destacado",
  };
}

function formatPct(value: number | null) {
  if (value === null) return "N/D";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export const CustomAnomalyScanner: React.FC = () => {
  const [symbolsInput, setSymbolsInput] = useState(PRESET_SYMBOLS.join(", "));
  const [results, setResults] = useState<AnomalyCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const symbols = useMemo(() => parseSymbols(symbolsInput), [symbolsInput]);

  const scan = async () => {
    if (!symbols.length) return;
    setLoading(true);
    setMessage(null);

    const scanSymbol = async (symbol: string): Promise<AnomalyCandidate | null> => {
      try {
        const [quoteResult, historicalResult] = await Promise.all([
          fetchMarketQuoteViaProxy(symbol),
          fetchMarketHistoricalViaProxy(symbol),
        ]);

        if (!quoteResult.ok || !historicalResult.ok) return null;
        const quote = quoteResult.data;
        const historical = historicalResult.data;
        const price = num(quote.price);
        const high52 = num(historical.fiftyTwoWeekHigh);
        const drawdown52w =
          price !== null && high52 !== null && high52 > 0
            ? Math.max(0, ((high52 - price) / high52) * 100)
            : null;

        const base = {
          symbol,
          price,
          currency: quote.currency || "USD",
          drawdown52w,
          change1m: num(historical.oneMonthChangePercent),
          change3m: num(historical.threeMonthChangePercent),
          change1y: num(historical.oneYearChangePercent),
        };
        return { ...base, ...calculateAnomalyScore(base) };
      } catch {
        return null;
      }
    };

    const next: AnomalyCandidate[] = [];
    for (let i = 0; i < symbols.length; i += 6) {
      const batch = symbols.slice(i, i + 6);
      const scanned = await Promise.all(batch.map(scanSymbol));
      next.push(...scanned.filter((item): item is AnomalyCandidate => item !== null));
    }

    setResults(next.sort((a, b) => b.score - a.score));
    setMessage(
      next.length
        ? `Escaneados ${next.length} simbolos con Yahoo Finance. Limite prudente: 40 por busqueda.`
        : "No se pudieron obtener datos para esos simbolos."
    );
    setLoading(false);
  };

  return (
    <section className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Radar className="text-emerald-400" size={20} />
            Radar experimental por tickers
          </h3>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Escanea cualquier simbolo compatible con Yahoo Finance y detecta anomalías tecnicas:
            caida desde maximos, rebote reciente y posible giro de momentum.
          </p>
        </div>
        <Badge variant="warning">Beta educativo</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
        <textarea
          value={symbolsInput}
          onChange={(event) => setSymbolsInput(event.target.value)}
          rows={3}
          placeholder="Ej. MSFT, ASML, PUIG.MC, ADYEN.AS..."
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 resize-none"
        />
        <button
          onClick={scan}
          disabled={loading || symbols.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
          {loading ? "Escaneando..." : `Escanear ${symbols.length}`}
        </button>
      </div>

      <div className="mt-3 flex items-start gap-2 text-[11px] text-slate-500">
        <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
        Para escanear miles de empresas de forma automática hace falta un screener backend con
        proveedor de pago y caché. Esta beta permite validar el radar con cualquier lista de tickers.
      </div>

      {message && <p className="mt-3 text-[11px] text-slate-500">{message}</p>}

      {results.length > 0 && (
        <div className="mt-5 overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-950/70 text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-3 py-3">Ticker</th>
                <th className="px-3 py-3 text-right">Precio</th>
                <th className="px-3 py-3 text-right">Caida 52s</th>
                <th className="px-3 py-3 text-right">1m</th>
                <th className="px-3 py-3 text-right">3m</th>
                <th className="px-3 py-3 text-center">Score</th>
                <th className="px-3 py-3">Lectura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {results.map((result) => (
                <tr key={result.symbol} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-3 font-bold text-white">{result.symbol}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-slate-300">
                    {result.price === null ? "N/D" : `${result.price.toFixed(2)} ${result.currency}`}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-rose-400">
                    {result.drawdown52w === null ? "N/D" : (
                      <span className="inline-flex items-center gap-1 justify-end">
                        <TrendingDown size={12} />-{result.drawdown52w.toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-slate-300">
                    {formatPct(result.change1m)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-slate-300">
                    {formatPct(result.change3m)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-400">
                      <Zap size={12} /> {result.score}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-200">{result.signal}</span>
                      <span className="text-[10px] text-slate-500">{result.reason}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
