import { AssetType, ProcessedAsset } from "../types";

export type OpportunityRiskBand = "prudente" | "vigilar" | "especulativa";

export interface OpportunityCandidate {
  asset: ProcessedAsset;
  score: number;
  riskBand: OpportunityRiskBand;
  setup: string;
  catalyst: string;
  evidence: string[];
  watchPoints: string[];
  distanceToLow52Week: number | null;
  distanceToHigh52Week: number | null;
  pullback1M: number | null;
  pullback3M: number | null;
  dataLabel: string;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function hasNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function distancePercent(price: number | null | undefined, anchor: number | null | undefined): number | null {
  if (!hasNumber(price) || !hasNumber(anchor) || anchor <= 0) return null;
  return ((price - anchor) / anchor) * 100;
}

function getPullbackScore(change: number | null): number {
  if (!hasNumber(change)) return 0;
  if (change <= -25) return 34;
  if (change <= -15) return 28;
  if (change <= -8) return 20;
  if (change <= -3) return 10;
  return 0;
}

function getLowDistanceScore(distanceToLow: number | null): number {
  if (!hasNumber(distanceToLow)) return 0;
  if (distanceToLow <= 5) return 26;
  if (distanceToLow <= 12) return 20;
  if (distanceToLow <= 22) return 12;
  return 0;
}

function getRiskBand(asset: ProcessedAsset): OpportunityRiskBand {
  if (asset.scores.risk >= 75 || asset.type === AssetType.Sector) return "especulativa";
  if (asset.scores.risk >= 50 || asset.scores.beginnerFriendly < 60) return "vigilar";
  return "prudente";
}

function getDataLabel(asset: ProcessedAsset): string {
  const marketData = asset.marketData;
  if (!marketData) return "sin datos de mercado";
  if (marketData.historicalStatus === "real") return "historico real";
  if (marketData.historicalStatus === "cache") return "historico en cache";
  if (marketData.status === "real") return marketData.fromCache ? "precio real en cache" : "precio real";
  if (marketData.status === "partial") return "dato parcial";
  return "dato educativo";
}

function inferSetup(asset: ProcessedAsset, pullback1M: number | null, pullback3M: number | null, distanceToLow: number | null): string {
  if (hasNumber(distanceToLow) && distanceToLow <= 8) {
    return "Cerca de minimo de 52 semanas";
  }
  if ((hasNumber(pullback1M) && pullback1M <= -10) || (hasNumber(pullback3M) && pullback3M <= -18)) {
    return "Caida reciente relevante";
  }
  if (asset.scores.valuation <= 55 && asset.scores.potential >= 70) {
    return "Valoracion razonable con potencial";
  }
  if (asset.scores.trust >= 85 && asset.scores.risk <= 50) {
    return "Empresa solida en vigilancia";
  }
  return "Idea para seguir, no para actuar rapido";
}

function inferCatalyst(asset: ProcessedAsset): string {
  const positiveNews = asset.news.find(item => item.impact === "positivo");
  if (positiveNews) return positiveNews.summary || positiveNews.title;
  if (asset.improvementConditions.length > 0) return asset.improvementConditions[0];
  return asset.radarReason;
}

export function buildOpportunityCandidates(assets: ProcessedAsset[], limit = 6): OpportunityCandidate[] {
  return assets
    .filter(asset => asset.type !== AssetType.Defensivo)
    .map(asset => {
      const marketData = asset.marketData;
      const price = marketData?.price;
      const low52 = marketData?.fiftyTwoWeekLow ?? marketData?.low52Week;
      const high52 = marketData?.fiftyTwoWeekHigh ?? marketData?.high52Week;
      const pullback1M = marketData?.oneMonthChangePercent ?? marketData?.changePercent1M ?? null;
      const pullback3M = marketData?.threeMonthChangePercent ?? null;
      const distanceToLow52Week = distancePercent(price, low52);
      const distanceToHigh52Week = distancePercent(price, high52);

      const pullbackScore = getPullbackScore(pullback1M) + getPullbackScore(pullback3M);
      const lowDistanceScore = getLowDistanceScore(distanceToLow52Week);
      const qualityScore = asset.scores.trust * 0.18 + asset.scores.potential * 0.22 + (100 - asset.scores.valuation) * 0.12;
      const riskPenalty = asset.scores.risk * 0.22;
      const staticOpportunity = asset.opportunityScore * 0.16;
      const catalystBonus = Math.min(10, asset.improvementConditions.length * 2 + asset.news.filter(n => n.impact === "positivo").length * 4);

      const score = clamp(qualityScore + pullbackScore + lowDistanceScore + staticOpportunity + catalystBonus - riskPenalty);
      const evidence = [
        hasNumber(pullback1M) ? `1M: ${pullback1M > 0 ? "+" : ""}${pullback1M.toFixed(1)}%` : "1M: sin historico",
        hasNumber(pullback3M) ? `3M: ${pullback3M > 0 ? "+" : ""}${pullback3M.toFixed(1)}%` : "3M: sin historico",
        hasNumber(distanceToLow52Week) ? `a ${distanceToLow52Week.toFixed(1)}% del minimo 52S` : "rango 52S pendiente",
        `confianza ${asset.scores.trust}/100`
      ];

      const watchPoints = [
        asset.worseningConditions[0] || "Confirmar tesis con fuentes externas antes de decidir",
        asset.cons[0] || "Revisar riesgo especifico del activo"
      ];

      return {
        asset,
        score,
        riskBand: getRiskBand(asset),
        setup: inferSetup(asset, pullback1M, pullback3M, distanceToLow52Week),
        catalyst: inferCatalyst(asset),
        evidence,
        watchPoints,
        distanceToLow52Week,
        distanceToHigh52Week,
        pullback1M,
        pullback3M,
        dataLabel: getDataLabel(asset)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
