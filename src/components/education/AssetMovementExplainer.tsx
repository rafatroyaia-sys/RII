import React from "react";
import { Activity, BarChart3, CheckCircle2, Compass, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { AssetType, MacroIndicator, MarketData, ProcessedAsset, RiskLevel } from "../../types";
import { ProcessedAsymmetryCompany } from "../../types/asymmetry";

interface AssetMovementExplainerProps {
  asset: ProcessedAsset;
  macroIndicators: MacroIndicator[];
  marketData: Partial<MarketData>;
}

interface AsymmetryMovementExplainerProps {
  company: ProcessedAsymmetryCompany;
}

function macroValue(indicators: MacroIndicator[], id: string) {
  return indicators.find((indicator) => indicator.id === id)?.value ?? null;
}

function pct(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function pricePosition(marketData: Partial<MarketData>) {
  const price = marketData.price ?? null;
  const low = marketData.fiftyTwoWeekLow ?? marketData.low52Week ?? null;
  const high = marketData.fiftyTwoWeekHigh ?? marketData.high52Week ?? null;
  if (!price || !low || !high || high <= low) return null;
  const position = ((price - low) / (high - low)) * 100;
  if (position >= 80) return "cerca de maximos de 52 semanas";
  if (position <= 25) return "cerca de minimos de 52 semanas";
  return "en zona media del rango anual";
}

function sectorMacroTilt(asset: ProcessedAsset, fed: number | null, inflation: number | null, us10y: number | null, vix: number | null, dollar: number | null) {
  const sectorText = `${asset.sector} ${asset.name} ${asset.type}`.toLowerCase();
  const isGrowth = sectorText.includes("tech") || sectorText.includes("ia") || sectorText.includes("semiconductor") || asset.scores.potential >= 75;
  const isDefensive = asset.type === AssetType.Defensivo || asset.riskLevel === RiskLevel.Bajo;
  const isEtf = asset.type === AssetType.ETF;

  const upside: string[] = [];
  const downside: string[] = [];

  if (isGrowth) {
    upside.push(us10y !== null && us10y < 4 ? "Bajada del bono 10Y: suele favorecer activos de crecimiento y tecnologia." : "Si baja el 10Y, el mercado puede pagar mas por beneficios futuros.");
    downside.push(fed !== null && fed >= 5 ? "Tipos Fed altos: reducen valoraciones de growth y exigen mas crecimiento real." : "Rebote fuerte de tipos: puede comprimir multiplos.");
  }

  if (isDefensive) {
    upside.push("Entorno incierto: activos defensivos suelen aguantar mejor cuando sube la aversion al riesgo.");
    downside.push("Mercado muy alcista: puede quedarse atras frente a activos de mayor beta.");
  }

  if (isEtf) {
    upside.push("Aportaciones periodicas y diversificacion: reducen dependencia de acertar el momento exacto.");
    downside.push(dollar !== null && dollar >= 120 ? "Dolar fuerte: puede alterar rentabilidad en euros y exposicion internacional." : "Concentracion del indice: revisar peso real de los mayores componentes.");
  }

  if (inflation !== null && inflation >= 4) {
    downside.push("Inflacion alta: puede retrasar bajadas de tipos y presionar margenes si no hay poder de precios.");
  } else {
    upside.push("Inflacion moderada o bajando: mejora visibilidad para tipos y valoraciones.");
  }

  if (vix !== null && vix >= 25) {
    downside.push("VIX alto: el mercado esta nervioso; conviene entrar por tramos y exigir margen de seguridad.");
  }

  return {
    upside: [...new Set(upside)].slice(0, 4),
    downside: [...new Set(downside)].slice(0, 4),
  };
}

export const AssetMovementExplainer: React.FC<AssetMovementExplainerProps> = ({ asset, macroIndicators, marketData }) => {
  const fed = macroValue(macroIndicators, "FEDFUNDS");
  const inflation = macroValue(macroIndicators, "CPI_YOY");
  const coreInflation = macroValue(macroIndicators, "CORE_CPI_YOY");
  const us10y = macroValue(macroIndicators, "GS10");
  const curve = macroValue(macroIndicators, "YIELD_CURVE_10Y2Y");
  const vix = macroValue(macroIndicators, "VIXCLS");
  const dollar = macroValue(macroIndicators, "DTWEXBGS");
  const tilt = sectorMacroTilt(asset, fed, inflation, us10y, vix, dollar);
  const range = pricePosition(marketData);
  const oneMonth = pct(marketData.oneMonthChangePercent ?? marketData.changePercent1M);
  const threeMonth = pct(marketData.threeMonthChangePercent);
  const oneYear = pct(marketData.oneYearChangePercent ?? marketData.changePercent1Y);

  const technical = [
    oneMonth ? `Tendencia 1M: ${oneMonth}.` : "Tendencia 1M pendiente de dato historico.",
    threeMonth ? `Tendencia 3M: ${threeMonth}.` : "Tendencia 3M pendiente de dato historico.",
    oneYear ? `Tendencia 1A: ${oneYear}.` : "Tendencia anual pendiente de dato historico.",
    range ? `Precio actual: ${range}.` : "Rango 52 semanas no disponible.",
  ];

  const fundamentals = [
    `Calidad/confianza ${asset.scores.trust}/100: ${asset.scores.trust >= 75 ? "base razonable para estudiar con calma" : "requiere mas comprobacion externa"}.`,
    `Potencial ${asset.scores.potential}/100 frente a riesgo ${asset.scores.risk}/100: ${asset.scores.potential > asset.scores.risk ? "asimetria educativa favorable" : "riesgo alto frente al potencial estimado"}.`,
    `Valoracion ${asset.valuationLabel}: si el precio es exigente, la tesis necesita mas crecimiento y margen de seguridad.`,
    asset.improvementConditions[0] ? `Catalizador a vigilar: ${asset.improvementConditions[0]}` : "Falta catalizador claro: vigilar antes de decidir.",
  ];

  const macroSnapshot = [
    fed !== null ? `Fed ${fed.toFixed(2)}%` : "Fed --",
    inflation !== null ? `IPC ${inflation.toFixed(2)}%` : "IPC --",
    coreInflation !== null ? `Suby. ${coreInflation.toFixed(2)}%` : "Suby. --",
    us10y !== null ? `10Y ${us10y.toFixed(2)}%` : "10Y --",
    curve !== null ? `Curva ${curve.toFixed(2)} p.p.` : "Curva --",
    vix !== null ? `VIX ${vix.toFixed(1)}` : "VIX --",
  ];

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-300 flex items-center gap-2">
            <Compass size={16} />
            Que puede mover este activo
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Lectura educativa que conecta macroeconomia, analisis tecnico y fundamentales. No predice el futuro; ayuda a saber que mirar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {macroSnapshot.map((item) => (
            <span key={item} className="rounded-full border border-cyan-500/20 bg-slate-950/50 px-2 py-1 text-[10px] font-bold text-slate-300">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/20 bg-slate-950/40 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <TrendingUp size={14} />
            Podria subir si...
          </h4>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
            {[...tilt.upside, asset.pros[0], asset.improvementConditions[0]].filter(Boolean).slice(0, 5).map((item) => (
              <li key={item} className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-slate-950/40 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-300">
            <TrendingDown size={14} />
            Podria bajar si...
          </h4>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
            {[...tilt.downside, asset.cons[0], asset.worseningConditions[0]].filter(Boolean).slice(0, 5).map((item) => (
              <li key={item} className="flex gap-2"><ShieldAlert size={14} className="mt-0.5 shrink-0 text-rose-400" />{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-300">
            <Activity size={14} />
            Lectura tecnica
          </h4>
          <ul className="space-y-2 text-xs leading-relaxed text-slate-300">
            {technical.map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-300">
            <BarChart3 size={14} />
            Lectura fundamental
          </h4>
          <ul className="space-y-2 text-xs leading-relaxed text-slate-300">
            {fundamentals.map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
};

export const AsymmetryMovementExplainer: React.FC<AsymmetryMovementExplainerProps> = ({ company }) => {
  const upside = [
    company.revenueGrowth !== null && company.revenueGrowth > 15 ? "Crecimiento de ingresos alto: si se mantiene, el mercado puede revalorar la empresa." : "Aceleracion de ingresos: seria una senal positiva para la tesis.",
    company.operatingMargin !== null && company.operatingMargin > 15 ? "Margen operativo sano: da margen para absorber errores o ciclo." : "Mejora de margenes: confirmaria que el negocio escala mejor.",
    company.fcf === "positivo_creciente" ? "Flujo de caja libre positivo y creciente: reduce dependencia de financiacion externa." : "Paso a caja positiva: podria cambiar la percepcion de riesgo.",
    company.catalystsToRise[0],
  ].filter(Boolean);

  const downside = [
    company.netDebtToEbitda !== null && company.netDebtToEbitda > 3 ? "Deuda elevada: con tipos altos puede pesar sobre valoracion y supervivencia." : "Empeoramiento de deuda o liquidez: invalidaria parte de la asimetria.",
    company.momentum3m !== null && company.momentum3m < -10 ? "Momentum 3M negativo: el mercado aun no confirma recuperacion." : "Perdida de momentum: avisaria de que la recuperacion no llega.",
    company.fcf === "negativo" ? "FCF negativo: si no mejora, puede exigir ampliaciones o mas deuda." : "Deterioro de caja: senal de alerta.",
    company.redFlagsToDiscard[0],
  ].filter(Boolean);

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
      <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-cyan-300">
        <Compass size={14} /> Que puede mover esta asimetria
      </h4>
      <p className="mb-4 text-sm leading-relaxed text-slate-300">
        La asimetria no depende solo del descuento. Tiene que mejorar el negocio, confirmarse el catalizador y no romperse el balance.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/20 bg-slate-950/40 p-4">
          <h5 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <TrendingUp size={14} /> Podria subir si...
          </h5>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
            {upside.slice(0, 5).map((item) => <li key={item} className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />{item}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-slate-950/40 p-4">
          <h5 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-300">
            <TrendingDown size={14} /> Podria bajar si...
          </h5>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
            {downside.slice(0, 5).map((item) => <li key={item} className="flex gap-2"><ShieldAlert size={14} className="mt-0.5 shrink-0 text-rose-400" />{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
};
