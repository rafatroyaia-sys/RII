export interface AssetMapping {
  internalTicker: string;
  providerSymbol: string;
  provider: "alpha_vantage" | "ecb" | "fred";
  notes?: string;
  enabledForRealMarketData: boolean;
}

export const assetMappings: Record<string, AssetMapping> = {

  // ─── ACCIONES (US) ────────────────────────────────────────────────────────
  "MSFT":   { internalTicker: "MSFT",   providerSymbol: "MSFT",   provider: "alpha_vantage", enabledForRealMarketData: true },
  "AAPL":   { internalTicker: "AAPL",   providerSymbol: "AAPL",   provider: "alpha_vantage", enabledForRealMarketData: true },
  "NVDA":   { internalTicker: "NVDA",   providerSymbol: "NVDA",   provider: "alpha_vantage", enabledForRealMarketData: true },
  "GOOGL":  { internalTicker: "GOOGL",  providerSymbol: "GOOGL",  provider: "alpha_vantage", enabledForRealMarketData: true },
  "AMZN":   { internalTicker: "AMZN",   providerSymbol: "AMZN",   provider: "alpha_vantage", enabledForRealMarketData: true },
  "TSLA":   { internalTicker: "TSLA",   providerSymbol: "TSLA",   provider: "alpha_vantage", enabledForRealMarketData: true },
  "V":      { internalTicker: "V",      providerSymbol: "V",      provider: "alpha_vantage", enabledForRealMarketData: true },
  "ASML":   { internalTicker: "ASML",   providerSymbol: "ASML",   provider: "alpha_vantage", enabledForRealMarketData: true },
  "NOVO-B": { internalTicker: "NOVO-B", providerSymbol: "NVO",    provider: "alpha_vantage", enabledForRealMarketData: true, notes: "ADR de Novo Nordisk en EE.UU. (NVO) — equivalente cotizado en NYSE" },
  "BRK.A":  { internalTicker: "BRK.A",  providerSymbol: "BRK-B",  provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Se usa BRK-B para evitar valores atípicos de la clase A (precio >700.000 USD)" },

  // ─── ETFs GLOBALES (Bolsas europeas) ──────────────────────────────────────
  "VWCE":   { internalTicker: "VWCE", providerSymbol: "VWCE.DE", provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Vanguard FTSE All-World Acc. — cotiza en XETRA (EUR)" },
  "IWDA":   { internalTicker: "IWDA", providerSymbol: "IWDA.L",  provider: "alpha_vantage", enabledForRealMarketData: true, notes: "iShares Core MSCI World — cotiza en Londres (USD)" },
  "CSPX":   { internalTicker: "CSPX", providerSymbol: "CSPX.L",  provider: "alpha_vantage", enabledForRealMarketData: true, notes: "iShares Core S&P 500 — cotiza en Londres (USD)" },
  "EIMI":   { internalTicker: "EIMI", providerSymbol: "EIMI.L",  provider: "alpha_vantage", enabledForRealMarketData: true, notes: "iShares Core MSCI EM IMI — cotiza en Londres (USD)" },
  "AGGG":   { internalTicker: "AGGG", providerSymbol: "AGGG.L",  provider: "alpha_vantage", enabledForRealMarketData: true, notes: "iShares Core Global Aggregate Bond — cotiza en Londres (USD)" },
  "XEON":   { internalTicker: "XEON", providerSymbol: "XEON.DE", provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Xtrackers EUR Overnight Rate Swap — cotiza en XETRA (EUR)" },

  // ─── ETFs SECTORIALES (US-listed, universalmente soportados) ──────────────
  "SMH":    { internalTicker: "SMH",  providerSymbol: "SMH",   provider: "alpha_vantage", enabledForRealMarketData: true, notes: "VanEck Semiconductor ETF — NYSE Arca (USD)" },
  "CYBR":   { internalTicker: "CYBR", providerSymbol: "CIBR",  provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: First Trust NASDAQ Cybersecurity ETF (CIBR) — NYSE Arca (USD)" },

  // ─── SECTORES (representados por ETFs de referencia) ─────────────────────
  "IA/SEC":     { internalTicker: "IA/SEC",     providerSymbol: "BOTZ",  provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: Global X Robotics & AI ETF (BOTZ) — sector IA/Robótica (USD)" },
  "SEMI/SEC":   { internalTicker: "SEMI/SEC",   providerSymbol: "SMH",   provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: VanEck Semiconductor ETF (SMH) — sector semiconductores (USD)" },
  "CYBER/SEC":  { internalTicker: "CYBER/SEC",  providerSymbol: "CIBR",  provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: First Trust NASDAQ Cybersecurity ETF (CIBR) — sector ciberseguridad (USD)" },
  "HLTH/SEC":   { internalTicker: "HLTH/SEC",   providerSymbol: "XLV",   provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: Health Care Select Sector SPDR (XLV) — sector salud (USD)" },
  "NUCL/SEC":   { internalTicker: "NUCL/SEC",   providerSymbol: "URA",   provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: Global X Uranium ETF (URA) — sector nuclear/uranio (USD)" },
  "DEFN/SEC":   { internalTicker: "DEFN/SEC",   providerSymbol: "ITA",   provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: iShares U.S. Aerospace & Defense ETF (ITA) — sector defensa (USD)" },
  "WATR/SEC":   { internalTicker: "WATR/SEC",   providerSymbol: "PHO",   provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: Invesco Water Resources ETF (PHO) — sector agua (USD)" },
  "STPL/SEC":   { internalTicker: "STPL/SEC",   providerSymbol: "XLP",   provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: Consumer Staples Select Sector SPDR (XLP) — consumo básico (USD)" },
  "GREEN/SEC":  { internalTicker: "GREEN/SEC",  providerSymbol: "ICLN",  provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: iShares Global Clean Energy ETF (ICLN) — energías renovables (USD)" },
  "INFR/SEC":   { internalTicker: "INFR/SEC",   providerSymbol: "IGF",   provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: iShares Global Infrastructure ETF (IGF) — infraestructura real (USD)" },

  // ─── DEFENSIVOS ────────────────────────────────────────────────────────────
  "MONEY/EUR":  { internalTicker: "MONEY/EUR",  providerSymbol: "XEON.DE", provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: XEON.DE (Xtrackers EUR Overnight) — monetario EUR de referencia (EUR)" },
  "GOVT/ST":    { internalTicker: "GOVT/ST",    providerSymbol: "SHY",     provider: "alpha_vantage", enabledForRealMarketData: true, notes: "Proxy: iShares 1-3 Year Treasury Bond ETF (SHY) — bonos corto plazo soberanos (USD)" },
};
