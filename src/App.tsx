/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useState, useMemo, useEffect, useCallback } from 'react';
import { mockAssets } from './data/mockAssets';
import { mockMentors, KNOWLEDGE_DISCLAIMER } from './data/mockKnowledge';
import { processAssets } from './logic/scoringEngine';
import { buildOpportunityCandidates } from './logic/opportunityRadar';
import { ProcessedAsset, AssetType, Horizon, RiskLevel, MarketData, MacroIndicator, DataQuality } from './types';
import { fetchMarketHistorical, fetchManyMarketData } from './services/marketDataService';
import { fetchMacroIndicators } from './services/macroDataService';
import { enrichAssetsWithMarketData } from './logic/enrichAssets';
import { assetMappings } from './data/assetMappings';

// UI Components
import { WarningBanner } from './components/ui/WarningBanner';
import { SectionCard } from './components/ui/SectionCard';
import { DataStatusBanner } from './components/data/DataStatusBanner';
import { DataDiagnosticsPanel } from './components/data/DataDiagnosticsPanel';
import { ProviderHealthPanel } from './components/data/ProviderHealthPanel';
import { FinancialPlanPanel } from './components/planning/FinancialPlanPanel';

// Dashboard Components
import { SummaryCards } from './components/dashboard/SummaryCards';
import { AssetFilters } from './components/dashboard/AssetFilters';
import { AssetTable } from './components/dashboard/AssetTable';
import { AssetDetailModal } from './components/dashboard/AssetDetailModal';
import { MiniRanking } from './components/dashboard/MiniRanking';
import { OpportunityCatalystPanel } from './components/dashboard/OpportunityCatalystPanel';
import { InvestorCockpitPanel } from './components/dashboard/InvestorCockpitPanel';
import { AssetComparisonPanel } from './components/dashboard/AssetComparisonPanel';
import { MacroDashboard } from './components/data/MacroDashboard';
import { MacroTrafficLight } from './components/data/MacroTrafficLight';
import { CompoundInterestCalculator } from './components/tools/CompoundInterestCalculator';
import { InvestorProfileTest } from './components/tools/InvestorProfileTest';
import { PortfolioPage } from './components/portfolio/PortfolioPage';
import { InvestmentDriversPanel } from './components/education/InvestmentDriversPanel';
import { MacroScenarioPanel } from './components/education/MacroScenarioPanel';
import { InvestorRoutinePanel } from './components/education/InvestorRoutinePanel';
import { InvestmentGlossaryPanel } from './components/education/InvestmentGlossaryPanel';
import { MethodologyTrustPanel } from './components/education/MethodologyTrustPanel';
import { DecisionChecklistPanel } from './components/education/DecisionChecklistPanel';
import { TrustPrivacyPanel } from './components/education/TrustPrivacyPanel';
import { LegalNoticePanel } from './components/education/LegalNoticePanel';

// Charts
import { RiskPotentialMap } from './components/charts/RiskPotentialMap';
import { OpportunityBarChart } from './components/charts/OpportunityBarChart';
import { DistributionCharts } from './components/charts/DistributionCharts';

// Knowledge
import { MentorPanel } from './components/knowledge/MentorPanel';
import { KnowledgeRulesPanel } from './components/knowledge/KnowledgeRulesPanel';

// Icons
import { 
  Radar, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Map as MapIcon, 
  Info,
  RefreshCw,
  Home,
  UserCheck,
  Calculator,
  Globe,
  BookOpen,
  Crosshair,
  Briefcase,
  Database,
  Scale,
  ShieldCheck,
  FlaskConical,
  Compass,
  ArrowRight
} from 'lucide-react';

const OPPORTUNITY_HISTORICAL_LIMIT = 14;

const TradingLabPage = lazy(() =>
  import('./components/lab/TradingLabPage').then(module => ({ default: module.TradingLabPage }))
);

const AsymmetryRadarPage = lazy(() =>
  import('./components/asymmetry/AsymmetryRadarPage').then(module => ({ default: module.AsymmetryRadarPage }))
);

type TabId = 'home' | 'profile' | 'portfolio' | 'calculator' | 'lab' | 'radar' | 'asimetria' | 'macro' | 'education';

const TAB_GUIDANCE: Record<TabId, {
  label: string;
  title: string;
  description: string;
  nextStep: string;
}> = {
  home: {
    label: 'Visión general',
    title: 'Empieza por el proceso, no por la prisa',
    description: 'Inicio reúne la ruta recomendada, el estado de datos y los paneles de confianza para usar la herramienta con orden.',
    nextStep: 'Completa perfil, lee macro y después estudia activos.'
  },
  profile: {
    label: 'Paso 1',
    title: 'Define tu perfil antes de mirar oportunidades',
    description: 'El perfil ayuda a traducir tolerancia al riesgo, horizonte y reacción emocional a una guía educativa más realista.',
    nextStep: 'Usa el resultado para filtrar cartera, radar y laboratorio.'
  },
  portfolio: {
    label: 'Control personal',
    title: 'Comprueba si tu cartera encaja contigo',
    description: 'Aquí el inversor ve concentración, riesgo, impacto de caídas y cuánto costaría recuperar pérdidas con aportaciones.',
    nextStep: 'Contrasta cada posición con macro, riesgo y diversificación.'
  },
  calculator: {
    label: 'Planificación',
    title: 'Convierte objetivos en números entendibles',
    description: 'La calculadora enseña cómo interactúan aportaciones, tiempo, rentabilidad esperada e inflación sin prometer resultados.',
    nextStep: 'Ajusta hipótesis conservadoras antes de mirar activos concretos.'
  },
  lab: {
    label: 'Simulación',
    title: 'Prueba ideas sin tocar dinero real',
    description: 'El laboratorio sirve para ensayar reglas, comparar escenarios y registrar operaciones simuladas con disciplina.',
    nextStep: 'Valida una tesis en paper trading antes de plantear una acción real.'
  },
  radar: {
    label: 'Estudio de activos',
    title: 'Prioriza qué merece análisis, no qué comprar',
    description: 'El radar ordena activos por criterios educativos y muestra qué variables macro, técnicas y fundamentales pueden moverlos.',
    nextStep: 'Abre el detalle de cada activo y revisa qué lo puede mover arriba o abajo.'
  },
  asimetria: {
    label: 'Oportunidades castigadas',
    title: 'Busca asimetrías con control de riesgo',
    description: 'Este radar detecta activos con castigo, catalizadores y posible recuperación, pero obliga a mirar riesgos e invalidaciones.',
    nextStep: 'Comprueba si la oportunidad encaja con tu perfil y tu cartera.'
  },
  macro: {
    label: 'Contexto de mercado',
    title: 'Lee el viento antes de mirar el activo',
    description: 'Macroeconomía conecta tipos, inflación, curva, bonos, VIX y dólar con escenarios que suelen favorecer o perjudicar activos.',
    nextStep: 'Identifica el escenario dominante y luego revisa radar o cartera.'
  },
  education: {
    label: 'Aprendizaje',
    title: 'Aprende el método para decidir mejor',
    description: 'Formación agrupa glosario, escenarios, metodología y reglas para que el usuario entienda la herramienta sin salir de la app.',
    nextStep: 'Busca los conceptos que no entiendas y vuelve al radar con más criterio.'
  }
};

const TabGuidancePanel: React.FC<{
  activeTab: TabId;
}> = ({ activeTab }) => {
  const guidance = TAB_GUIDANCE[activeTab];

  return (
    <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-lg shadow-slate-950/20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
            <Compass size={18} />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-1">{guidance.label}</div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight">{guidance.title}</h2>
            <p className="mt-2 text-sm sm:text-base text-slate-400 leading-relaxed max-w-4xl">{guidance.description}</p>
          </div>
        </div>
        <div className="lg:max-w-sm rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 mb-1">
            <ArrowRight size={14} />
            Siguiente paso
          </div>
          <p className="text-sm font-semibold text-slate-200 leading-snug">{guidance.nextStep}</p>
        </div>
      </div>
    </div>
  );
};

const TabLoading: React.FC = () => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm font-semibold text-slate-300">
    Cargando módulo...
  </div>
);

const MethodologyPanel: React.FC = () => {
  const items = [
    {
      icon: <Scale size={18} />,
      title: "Puntuación educativa",
      text: "Combina potencial, riesgo, confianza, valoración, horizonte y facilidad para principiantes. Ordena ideas para estudiar, no órdenes de compra."
    },
    {
      icon: <Database size={18} />,
      title: "Datos trazables",
      text: "Cuando hay API disponible usa datos reales o caché; si no, muestra simulación educativa y lo indica de forma visible."
    },
    {
      icon: <ShieldCheck size={18} />,
      title: "Guardarraíles",
      text: "Prioriza advertencias, perfil de riesgo, diversificación y condiciones que invalidarían una tesis antes de hablar de rentabilidad."
    }
  ];

  return (
    <SectionCard
      title="Cómo se calcula el radar"
      subtitle="Resumen simple de la metodología para interpretar las puntuaciones"
      icon={<Info size={18} />}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.title} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              {item.icon}
              <h4 className="font-bold text-slate-100">{item.title}</h4>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
        El radar sirve para priorizar estudio y vigilancia. Antes de invertir conviene revisar fuente, fecha, liquidez, fiscalidad, costes, horizonte y concentración de cartera.
      </div>
    </SectionCard>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [filters, setFilters] = useState({
    type: "",
    horizon: "",
    risk: "",
    search: ""
  });

  const [selectedAsset, setSelectedAsset] = useState<ProcessedAsset | null>(null);
  const [macroIndicators, setMacroIndicators] = useState<MacroIndicator[]>([]);
  const [marketDataMap, setMarketDataMap] = useState<Record<string, MarketData>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<{score: number, name: string} | null>(null);
  const [calculatorPrefilled, setCalculatorPrefilled] = useState<{
    assetTicker: string;
    assetName: string;
    annualReturn: number;
  } | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQuality>({
    marketDataStatus: "simulated",
    macroDataStatus: "simulated",
    message: "Los datos reales, si están disponibles, se usan solo con finalidad educativa. Los datos pueden tener retrasos, errores o estar incompletos.",
    isUsingCache: false
  });

  const loadUserProfile = () => {
    const saved = localStorage.getItem('investor_profile_score');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let name = "Desconocido";
        const s = parsed.score;
        if (s <= 20) name = "Muy Conservador";
        else if (s <= 40) name = "Conservador";
        else if (s <= 60) name = "Moderado";
        else if (s <= 80) name = "Dinámico";
        else name = "Agresivo";
        setUserProfile({ score: s, name });
      } catch (e) {}
    } else {
      setUserProfile(null);
    }
  };

  useEffect(() => {
    loadUserProfile();
    // This allows the profile to update if the test gets done
    window.addEventListener('storage', loadUserProfile);
    return () => window.removeEventListener('storage', loadUserProfile);
  }, []);

  // Process data once
  const baseProcessedAssets = useMemo(() => processAssets(mockAssets, mockMentors), []);
  
  const allProcessedAssets = useMemo(() => {
    return enrichAssetsWithMarketData(baseProcessedAssets, marketDataMap);
  }, [baseProcessedAssets, marketDataMap]);

  const loadData = useCallback(async (forceRefresh = false) => {
    setIsRefreshing(true);
    try {
      const macro = await fetchMacroIndicators(forceRefresh);
      setMacroIndicators(macro);
      
      const tickers = mockAssets.map(a => a.ticker);
      const market = await fetchManyMarketData(tickers, forceRefresh);
      setMarketDataMap(market);
      const opportunityTickers = [...mockAssets]
        .filter(asset => assetMappings[asset.ticker]?.enabledForRealMarketData && asset.type !== AssetType.Defensivo)
        .sort((a, b) => {
          const aScore = a.scores.potential + a.scores.trust - a.scores.risk * 0.6;
          const bScore = b.scores.potential + b.scores.trust - b.scores.risk * 0.6;
          return bScore - aScore;
        })
        .slice(0, OPPORTUNITY_HISTORICAL_LIMIT)
        .map(asset => asset.ticker);

      const marketWithHistorical = { ...market };
      for (const ticker of opportunityTickers) {
        const historical = await fetchMarketHistorical(ticker, false, forceRefresh);
        marketWithHistorical[ticker] = {
          ...marketWithHistorical[ticker],
          ...historical
        };
      }
      setMarketDataMap(marketWithHistorical);

      const enabledMarketVals = Object.values(marketWithHistorical).filter(m => assetMappings[m.symbol]?.enabledForRealMarketData);
      let marketStatus: string = "simulated";
      if (enabledMarketVals.length > 0) {
        const allMarketReal = enabledMarketVals.every(m => m.status === 'real' && !m.fromCache);
        const allMarketCache = enabledMarketVals.every(m => m.status === 'real' && m.fromCache);
        const anyMarketRealOrPartial = enabledMarketVals.some(m => m.status === 'real' || m.status === 'partial');
        const allMarketError = enabledMarketVals.every(m => m.status === 'error'); // only pure errors

        if (allMarketReal) marketStatus = "real";
        // To be safe with types, if DataQuality is somewhat restrictive
        else if (allMarketCache) marketStatus = "cache";
        else if (anyMarketRealOrPartial) marketStatus = "partial";
        else if (allMarketError) marketStatus = "error";
        else marketStatus = "simulated";
      }

      let macroStatus: string = "simulated";
      const fredIndicators = macro.filter(m => m.id !== 'ECB_RATE'); // Ignore ECB mock for global status
      
      if (fredIndicators.length > 0) {
        const allMacroReal = fredIndicators.every(m => m.status === 'real' && !m.fromCache);
        const allMacroCache = fredIndicators.every(m => m.status === 'real' && m.fromCache);
        const anyMacroRealOrPartial = fredIndicators.some(m => m.status === 'real' || m.status === 'partial');
        const allMacroError = fredIndicators.every(m => m.status === 'error');

        if (allMacroReal) macroStatus = "real";
        else if (allMacroCache) macroStatus = "cache";
        else if (anyMacroRealOrPartial) macroStatus = "partial";
        else if (allMacroError) macroStatus = "error";
        else macroStatus = "simulated";
      }

      const anyMarketCache = Object.values(marketWithHistorical).some(m => m.fromCache);
      const anyMacroCache = macro.some(m => m.fromCache);
      const isUsingCache = anyMarketCache || anyMacroCache;
      
      const isMarketRateLimited = Object.values(marketWithHistorical).some(m => m.errorReason?.includes("limit") || m.errorReason?.includes("Límite") || m.fallbackReason?.includes("Límite"));

      setDataQuality(prev => ({
        ...prev,
        marketDataStatus: marketStatus as any,
        macroDataStatus: macroStatus as any,
        isUsingCache,
        isMarketRateLimited
      }));
    } catch (err) {
      console.warn("Aviso: Fallo al cargar datos enriquecidos (puede ser rate limit o red):", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter logic
  const filteredAssets = useMemo(() => {
    return allProcessedAssets.filter(asset => {
      const matchType = !filters.type || asset.type === filters.type;
      const matchHorizon = !filters.horizon || asset.recommendedHorizon === filters.horizon;
      const matchRisk = !filters.risk || asset.riskLevel === filters.risk;
      const matchSearch = !filters.search || 
        asset.name.toLowerCase().includes(filters.search.toLowerCase()) || 
        asset.ticker.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchType && matchHorizon && matchRisk && matchSearch;
    });
  }, [allProcessedAssets, filters]);

  const opportunityCandidates = useMemo(() => {
    return buildOpportunityCandidates(allProcessedAssets, 6);
  }, [allProcessedAssets]);

  // Derived rankings
  const andreaTopETFs = useMemo(() => {
    return [...allProcessedAssets]
      .filter(a => a.type === AssetType.ETF)
      .sort((a, b) => {
        const aS = a.mentorScores.find(m => m.mentorId === 'andrea_redondo')?.score || 0;
        const bS = b.mentorScores.find(m => m.mentorId === 'andrea_redondo')?.score || 0;
        return bS - aS;
      })
      .slice(0, 5);
  }, [allProcessedAssets]);

  const andreaTopGeneral = useMemo(() => {
    return [...allProcessedAssets]
      .sort((a, b) => {
        const aS = a.mentorScores.find(m => m.mentorId === 'andrea_redondo')?.score || 0;
        const bS = b.mentorScores.find(m => m.mentorId === 'andrea_redondo')?.score || 0;
        return bS - aS;
      })
      .slice(0, 5);
  }, [allProcessedAssets]);

  const pabloTop = useMemo(() => {
    return [...allProcessedAssets].sort((a, b) => {
      const aS = a.mentorScores.find(m => m.mentorId === 'pablo_gil')?.score || 0;
      const bS = b.mentorScores.find(m => m.mentorId === 'pablo_gil')?.score || 0;
      return bS - aS;
    });
  }, [allProcessedAssets]);

  const lastUpdateDate = useMemo(() => {
    let latest = new Date(0);
    let hasRealOrCache = false;
    
    Object.values(marketDataMap).forEach((m: MarketData) => {
      if ((m.status === 'real' || m.historicalStatus === 'real' || m.historicalStatus === 'cache') && m.lastUpdated) {
        hasRealOrCache = true;
        const d = new Date(m.lastUpdated);
        if (d > latest) latest = d;
      }
    });

    macroIndicators.forEach((m: MacroIndicator) => {
      if (m.status === 'real' && m.lastUpdated) {
        hasRealOrCache = true;
        const d = new Date(m.lastUpdated);
        if (d > latest) latest = d;
      }
    });
    
    if (!hasRealOrCache) return "datos educativos simulados";
    
    const mapStatus = (s: string) => {
      switch(s) {
        case 'real': return 'Real';
        case 'cache': return 'Caché';
        case 'partial': return 'Parcial';
        case 'error': return 'Error';
        default: return 'Simulado';
      }
    };
    
    return `${latest.toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })} · Mercado: ${mapStatus(dataQuality.marketDataStatus)} / Macro: ${mapStatus(dataQuality.macroDataStatus)}`;
  }, [marketDataMap, macroIndicators, dataQuality]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-emerald-500/30 selection:text-emerald-200 font-sans">
      
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                <Radar className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h1 className="text-[2rem] leading-[1.05] sm:text-4xl sm:leading-tight font-extrabold text-white tracking-tight">
                RADAR <span className="text-emerald-400">INTELIGENTE</span> DE INVERSIÓN
              </h1>
            </div>
            <p className="text-slate-400 mt-3 sm:mt-2 font-medium text-base sm:text-lg max-w-3xl">Oportunidades, riesgos y tendencias explicadas fácil para principiantes</p>
          </div>
          <div className="text-left md:text-right flex flex-col items-start md:items-end gap-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-900 border border-white/5 py-1 px-3 rounded-full">
              Actualizado: {lastUpdateDate}
            </span>
            <button 
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Actualizando datos..." : "Actualizar datos"}
            </button>
          </div>
        </header>

        {/* Warning Banner */}
        <WarningBanner 
          type="warning"
          message="Herramienta educativa: no constituye asesoramiento financiero. Usa el radar para estudiar y comparar; valida siempre los datos antes de tomar decisiones de inversión."
        />
        <DataStatusBanner quality={dataQuality} isRefreshing={isRefreshing} />
        
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto whitespace-nowrap gap-2 mb-8 -mx-4 sm:mx-0 px-4 sm:px-2 py-2 bg-slate-900 border-y sm:border border-slate-800 sm:rounded-2xl sticky top-0 sm:top-3 z-40 shadow-xl shadow-slate-950/50 [&::-webkit-scrollbar]:hidden">
          <button onClick={() => setActiveTab('home')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex-shrink-0 ${activeTab === 'home' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}><Home size={16}/> Inicio</button>
          <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex-shrink-0 ${activeTab === 'profile' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}><UserCheck size={16}/> <span className="hidden sm:inline">Mi Perfil Inversor</span><span className="sm:hidden">Perfil</span></button>
          <button onClick={() => setActiveTab('portfolio')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex-shrink-0 ${activeTab === 'portfolio' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}><Briefcase size={16}/> <span className="hidden sm:inline">Mi Cartera</span><span className="sm:hidden">Cartera</span></button>
          <button onClick={() => setActiveTab('calculator')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex-shrink-0 ${activeTab === 'calculator' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}><Calculator size={16}/> Calculadora</button>
          <button onClick={() => setActiveTab('lab')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex-shrink-0 ${activeTab === 'lab' ? 'bg-slate-800 text-cyan-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}><FlaskConical size={16}/> Laboratorio</button>
          <button onClick={() => setActiveTab('radar')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex-shrink-0 ${activeTab === 'radar' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}><Radar size={16}/> Radar</button>
          <button onClick={() => setActiveTab('asimetria')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex-shrink-0 ${activeTab === 'asimetria' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}><Crosshair size={16}/> <span className="hidden sm:inline">Radar de Asimetría</span><span className="sm:hidden">Asimetría</span></button>
          <button onClick={() => setActiveTab('macro')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex-shrink-0 ${activeTab === 'macro' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}><Globe size={16}/> Macroeconomía</button>
          <button onClick={() => setActiveTab('education')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex-shrink-0 ${activeTab === 'education' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}><BookOpen size={16}/> Formación</button>
        </div>

        <TabGuidancePanel activeTab={activeTab} />

        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-emerald-500/30 p-6 sm:p-8 rounded-3xl shadow-[0_0_40px_-10px_rgba(16,185,129,0.15)]">
              <h2 className="text-3xl font-extrabold text-white mb-4">Bienvenido al Radar Inteligente</h2>
              <p className="text-slate-300 text-lg mb-6 max-w-3xl leading-relaxed">
                Esta es una <strong>herramienta educativa</strong> diseñada para ayudarte a entender cómo funcionan los mercados, cómo evaluar el riesgo y cómo se comporta el interés compuesto. <br/><br/>
                No te diremos qué comprar. Te ayudaremos a <strong>estudiar, vigilar y comparar</strong> activos como si tuvieras a un equipo de mentores a tu lado.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <button
                  onClick={() => setActiveTab('profile')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors"
                >
                  <UserCheck size={16} />
                  Empezar con mi perfil
                </button>
                <button
                  onClick={() => setActiveTab('radar')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-100 border border-slate-700 font-bold hover:bg-slate-700 transition-colors"
                >
                  <Radar size={16} />
                  Ver radar educativo
                </button>
              </div>
              
              <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <Info size={20}/> Ruta recomendada para principiantes
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div onClick={() => setActiveTab('profile')} className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-all hover:-translate-y-1">
                  <div className="text-emerald-500 font-bold mb-2">Paso 1</div>
                  <h4 className="text-white font-semibold mb-2">Conocer mi perfil</h4>
                  <p className="text-slate-400 text-xs">Descubre qué nivel de riesgo puedes asumir emocionalmente.</p>
                </div>
                <div onClick={() => setActiveTab('calculator')} className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-all hover:-translate-y-1">
                  <div className="text-emerald-500 font-bold mb-2">Paso 2</div>
                  <h4 className="text-white font-semibold mb-2">Interés compuesto</h4>
                  <p className="text-slate-400 text-xs">Entiende cómo el tiempo puede multiplicar tus aportaciones.</p>
                </div>
                <div onClick={() => setActiveTab('portfolio')} className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-all hover:-translate-y-1">
                  <div className="text-emerald-500 font-bold mb-2">Paso 3</div>
                  <h4 className="text-white font-semibold mb-2">Mi cartera</h4>
                  <p className="text-slate-400 text-xs">Registra tus activos de forma privada en este navegador.</p>
                </div>
                <div onClick={() => setActiveTab('radar')} className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-all hover:-translate-y-1">
                  <div className="text-emerald-500 font-bold mb-2">Paso 4</div>
                  <h4 className="text-white font-semibold mb-2">Estudiar activos</h4>
                  <p className="text-slate-400 text-xs">Explora el radar y mira qué opciones encajan contigo.</p>
                </div>
                <div onClick={() => setActiveTab('macro')} className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-all hover:-translate-y-1">
                  <div className="text-emerald-500 font-bold mb-2">Paso 5</div>
                  <h4 className="text-white font-semibold mb-2">Entorno global</h4>
                  <p className="text-slate-400 text-xs">Aprende cómo afecta la inflación y los tipos de interés.</p>
                </div>
                <div onClick={() => setActiveTab('education')} className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-all hover:-translate-y-1">
                  <div className="text-emerald-500 font-bold mb-2">Paso 6</div>
                  <h4 className="text-white font-semibold mb-2">Mente fría</h4>
                  <p className="text-slate-400 text-xs">Lee a los mentores y evita tomar decisiones impulsivas.</p>
                </div>
              </div>
            </div>
            
            <InvestorCockpitPanel
              userProfile={userProfile}
              macroIndicators={macroIndicators}
              opportunityCandidates={opportunityCandidates}
              assets={allProcessedAssets}
              onGoProfile={() => setActiveTab('profile')}
              onGoMacro={() => setActiveTab('macro')}
              onGoRadar={() => setActiveTab('radar')}
              onGoPortfolio={() => setActiveTab('portfolio')}
              onSelectAsset={setSelectedAsset}
            />
            <InvestorRoutinePanel
              userProfile={userProfile}
              macroIndicators={macroIndicators}
              onGoProfile={() => setActiveTab('profile')}
              onGoMacro={() => setActiveTab('macro')}
              onGoRadar={() => setActiveTab('radar')}
              onGoPortfolio={() => setActiveTab('portfolio')}
              onGoLab={() => setActiveTab('lab')}
            />
            <DecisionChecklistPanel
              userProfile={userProfile}
              macroIndicators={macroIndicators}
              onGoProfile={() => setActiveTab('profile')}
              onGoMacro={() => setActiveTab('macro')}
              onGoRadar={() => setActiveTab('radar')}
              onGoPortfolio={() => setActiveTab('portfolio')}
              onGoLab={() => setActiveTab('lab')}
            />
            <FinancialPlanPanel
              assets={allProcessedAssets}
              opportunityCandidates={opportunityCandidates}
              macroIndicators={macroIndicators}
              userProfile={userProfile}
              onGoProfile={() => setActiveTab('profile')}
              onGoPortfolio={() => setActiveTab('portfolio')}
              onGoRadar={() => setActiveTab('radar')}
              onGoEducation={() => setActiveTab('education')}
            />
            <MethodologyTrustPanel />
            <TrustPrivacyPanel />
            <details className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <summary className="cursor-pointer select-none text-sm font-bold text-amber-200">
                Aviso legal educativo
              </summary>
              <div className="mt-4">
                <LegalNoticePanel />
              </div>
            </details>
            <details className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <summary className="cursor-pointer select-none text-sm font-bold text-slate-200">
                Estado técnico de datos y proveedores
              </summary>
              <div className="mt-4 space-y-6">
                <ProviderHealthPanel quality={dataQuality} marketDataMap={marketDataMap} macroIndicators={macroIndicators} />
                <DataDiagnosticsPanel marketDataMap={marketDataMap} macroIndicators={macroIndicators} />
              </div>
            </details>
            <SummaryCards assets={allProcessedAssets} />
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <InvestorProfileTest />
          </div>
        )}

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CompoundInterestCalculator 
              prefilledParams={calculatorPrefilled}
              onClearPrefilled={() => setCalculatorPrefilled(null)}
            />
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <PortfolioPage assets={allProcessedAssets} onSelectAsset={setSelectedAsset} userProfile={userProfile} />
        )}

        {/* Laboratory Tab */}
        {activeTab === 'lab' && (
          <Suspense fallback={<TabLoading />}>
            <TradingLabPage
              assets={allProcessedAssets}
              userProfile={userProfile}
              onSelectAsset={setSelectedAsset}
            />
          </Suspense>
        )}

        {/* Education Tab */}
        {activeTab === 'education' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Info size={16} />
              <h2 className="text-sm font-bold uppercase tracking-widest">Base de Conocimiento</h2>
            </div>
            <MentorPanel mentors={mockMentors} />
            <div className="text-[10px] text-slate-500 italic mt-[-1rem] px-2 text-center">
              {KNOWLEDGE_DISCLAIMER}
            </div>
            <KnowledgeRulesPanel />
            <InvestorRoutinePanel
              userProfile={userProfile}
              macroIndicators={macroIndicators}
              onGoProfile={() => setActiveTab('profile')}
              onGoMacro={() => setActiveTab('macro')}
              onGoRadar={() => setActiveTab('radar')}
              onGoPortfolio={() => setActiveTab('portfolio')}
              onGoLab={() => setActiveTab('lab')}
            />
            <DecisionChecklistPanel
              userProfile={userProfile}
              macroIndicators={macroIndicators}
              onGoProfile={() => setActiveTab('profile')}
              onGoMacro={() => setActiveTab('macro')}
              onGoRadar={() => setActiveTab('radar')}
              onGoPortfolio={() => setActiveTab('portfolio')}
              onGoLab={() => setActiveTab('lab')}
            />
            <MethodologyTrustPanel />
            <TrustPrivacyPanel />
            <LegalNoticePanel />
            <InvestmentGlossaryPanel />
            <MacroScenarioPanel indicators={macroIndicators} />
            <InvestmentDriversPanel indicators={macroIndicators} />
          </div>
        )}

        {/* Macro Tab */}
        {activeTab === 'macro' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MacroTrafficLight indicators={macroIndicators} />
            <MacroDashboard indicators={macroIndicators} />
            <MacroScenarioPanel indicators={macroIndicators} />
            <InvestmentDriversPanel indicators={macroIndicators} />
          </div>
        )}

        {/* Radar Tab */}
        {activeTab === 'radar' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {userProfile ? (
              <div className="mb-6 bg-slate-900 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="text-emerald-500" size={24} />
                  <div>
                    <h3 className="text-white font-bold text-lg">Tu Perfil: {userProfile.name}</h3>
                    <p className="text-sm text-slate-400">El radar te mostrará etiquetas educativas basadas en este perfil. Recuerda, siempre investiga antes de tomar cualquier decisión.</p>
                  </div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Puntuación de riesgo</div>
                   <div className="text-2xl font-extrabold text-emerald-400">{userProfile.score} / 100</div>
                </div>
              </div>
            ) : (
              <div className="mb-6 bg-slate-800/80 border border-amber-500/30 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
                  <UserCheck size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold mb-1">Personaliza tu experiencia educativa</h3>
                  <p className="text-sm text-slate-400">Haz el test de perfil inversor en la pestaña "Mi Perfil Inversor" para ver etiquetas educativas adaptadas a ti en este radar.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Ir al Test
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Sidebar Left Rankings */}
              <div className="xl:col-span-1 space-y-6">
                <MiniRanking 
                  title="Ideas corto plazo" 
                  assets={allProcessedAssets} 
                  scoreKey="shortTermScore" 
                  onSelect={setSelectedAsset} 
                />
                <MiniRanking 
                  title="Ideas largo plazo" 
                  assets={allProcessedAssets} 
                  scoreKey="longTermScore" 
                  onSelect={setSelectedAsset} 
                />
                <MiniRanking 
                  title="ETFs educativos" 
                  assets={andreaTopETFs} 
                  scoreKey="andreaScore" 
                  onSelect={setSelectedAsset} 
                />
              </div>

              {/* Main Dashboard Area */}
              <div className="xl:col-span-3 space-y-8">
                <SectionCard
                  title="Activos para estudiar / catalizadores"
                  subtitle="Ideas ordenadas por caída, cercanía a mínimos, calidad y condiciones de mejora"
                  icon={<Radar size={18} />}
                >
                  <OpportunityCatalystPanel candidates={opportunityCandidates} onSelect={setSelectedAsset} />
                </SectionCard>

                <SectionCard
                  title="Comparar antes de decidir"
                  subtitle="Contrasta dos activos para entender potencial, riesgo, valoracion y encaje educativo"
                  icon={<Scale size={18} />}
                >
                  <AssetComparisonPanel assets={allProcessedAssets} onSelect={setSelectedAsset} />
                </SectionCard>
                
                {/* Filters */}
                <AssetFilters filters={filters} setFilters={setFilters} />

                {/* Main Table */}
                <SectionCard title="Ranking educativo del radar" subtitle="Orden algorítmico para estudiar relación oportunidad/riesgo; no es una recomendación de compra">
                  <AssetTable assets={filteredAssets} onSelect={setSelectedAsset} userProfile={userProfile} />
                </SectionCard>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <SectionCard title="Mapa Riesgo vs Potencial" subtitle="Ubicación visual de activos" icon={<MapIcon size={18} />}>
                    <RiskPotentialMap assets={filteredAssets} />
                  </SectionCard>
                  <SectionCard title="10 ideas con mayor puntuación" subtitle="Candidatas para análisis, no órdenes de compra" icon={<BarChart3 size={18} />}>
                    <OpportunityBarChart assets={filteredAssets} />
                  </SectionCard>
                </div>

                {/* Distribution Charts */}
                <SectionCard title="Distribución de Análisis" subtitle="Composición del radar actual" icon={<PieChartIcon size={18} />}>
                  <DistributionCharts assets={allProcessedAssets} />
                </SectionCard>
              </div>
            </div>
          </div>
        )}

        {/* Radar de Asimetría Tab */}
        {activeTab === 'asimetria' && (
          <Suspense fallback={<TabLoading />}>
            <AsymmetryRadarPage />
          </Suspense>
        )}

        {/* Footnote */}
        <footer className="pt-12 mt-12 border-t border-white/5 text-center">
          <p className="text-slate-500 text-sm">© 2026 Radar Inteligente de Inversión • Diseñado para la educación financiera simulada</p>
        </footer>
      </div>

      {/* Asset Detail Modal */}
      <AssetDetailModal 
        asset={selectedAsset} 
        onClose={() => setSelectedAsset(null)} 
        mentors={mockMentors}
        userProfile={userProfile}
        macroIndicators={macroIndicators}
        onCalculateAsset={(asset, customReturn) => {
          setSelectedAsset(null);
          setCalculatorPrefilled({
            assetTicker: asset.ticker,
            assetName: asset.name,
            annualReturn: customReturn
          });
          setActiveTab('calculator');
        }}
      />
    </div>
  );
}
