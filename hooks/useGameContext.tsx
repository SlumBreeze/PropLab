import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  PropLabState,
  PlayerPropItem,
  Slip,
  SlipSelection,
  GameEvent,
  PropMarketKey,
  SlipAnalysisResult
} from '../types';
import {
  fetchUpcomingEvents,
  fetchPropsForGame,
  getSupportedMarkets,
  clearCache,
  testApiConnection
} from '../services/oddsService';
import { matchAndFindEdges } from '../services/matchingService';
import { analyzeSlip } from '../services/geminiService';

const GameContext = createContext<PropLabState | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --------------------------------------------------------
  // STATE DEFINITIONS
  // --------------------------------------------------------
  const [games, setGames] = useState<GameEvent[]>([]);
  const [props, setProps] = useState<Record<string, PlayerPropItem>>({});
  const [slips, setSlips] = useState<Slip[]>([]);
  const [activeSlipId, setActiveSlipId] = useState<string | undefined>();

  const [displayMode, setDisplayMode] = useState<'PROPS' | 'SLIPS'>('PROPS');
  const [minEdgeScore, setMinEdgeScore] = useState<number>(75);

  // Analysis State
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [slipAnalysis, setSlipAnalysis] = useState<SlipAnalysisResult | null>(null);

  // Error State (for UI feedback)
  const [lastError, setLastError] = useState<string | null>(null);

  // Correlation Highlighting
  const [highlightTeam, setHighlightTeam] = useState<string | null>(null);

  // --------------------------------------------------------
  // METHODS
  // --------------------------------------------------------

  /**
   * Initial API Test on Mount
   */
  useEffect(() => {
    const init = async () => {
      console.log('[GameContext] 🚀 Initializing...');
      const apiOk = await testApiConnection();
      if (!apiOk) {
        setLastError("API connection failed - check your API key");
      }
    };
    init();
  }, []);

  /**
   * Scan Market: Fetches props for ALL games and finds edges
   * @param dateFilter - Optional ISO date (YYYY-MM-DD) to filter games for a specific day.
   */
  const scanMarket = async (dateFilter?: string) => {
    console.log(`[GameContext] 🔍 Starting scan${dateFilter ? ` for ${dateFilter}` : ''}...`);

    // Clear cache to get fresh data
    clearCache();

    // Always fetch fresh events
    console.log('[GameContext] 📅 Fetching events...');

    try {
      const [nba, nfl] = await Promise.all([
        fetchUpcomingEvents('basketball_nba', dateFilter, true), // force refresh
        fetchUpcomingEvents('americanfootball_nfl', dateFilter, true) // force refresh
      ]);

      const currentGames = [...nba, ...nfl];
      setGames(currentGames);

      console.log(`[GameContext] 📊 Found ${nba.length} NBA games, ${nfl.length} NFL games`);

      if (currentGames.length === 0) {
        console.warn('[GameContext] ⚠️ No games found for selected date');
        setLastError("No games found for selected date");
        return;
      }

      setLastError(null);

      console.log(`[GameContext] 🎯 Scanning ${currentGames.length} games for props...`);

      const newProps: Record<string, PlayerPropItem> = {};

      // Process games in batches to avoid overwhelming the API
      const BATCH_SIZE = 2; // Reduced batch size
      for (let i = 0; i < currentGames.length; i += BATCH_SIZE) {
        const batch = currentGames.slice(i, i + BATCH_SIZE);

        console.log(`[GameContext] 📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(currentGames.length / BATCH_SIZE)}`);

        await Promise.all(batch.map(async (game) => {
          const markets = getSupportedMarkets(game.sport_key);
          if (markets.length === 0) return;

          try {
            console.log(`[GameContext] 🏀 Fetching: ${game.away_team} @ ${game.home_team}`);

            const allLines = await fetchPropsForGame(game.sport_key, game.id, markets, true); // force refresh

            console.log(`[GameContext] 📈 ${game.away_team} @ ${game.home_team}: ${allLines.length} lines`);

            if (allLines.length === 0) {
              console.warn(`[GameContext] ⚠️ No lines for ${game.id}`);
              return;
            }

            // Group all lines by player/market
            const uniqueMarkets = Array.from(new Set(allLines.map(l => l.market)));
            for (const mkt of uniqueMarkets) {
              const marketLines = allLines.filter(l => l.market === mkt);
              const grouped = matchAndFindEdges(marketLines, game.id, game.sport_key, mkt);
              grouped.forEach(item => {
                item.team = `${game.away_team} @ ${game.home_team}`;
                newProps[item.id] = item;
              });
            }
          } catch (err) {
            console.warn(`[GameContext] ❌ Failed game ${game.id}`, err);
          }
        }));

        // Delay between batches to respect rate limits
        if (i + BATCH_SIZE < currentGames.length) {
          console.log('[GameContext] ⏳ Waiting 500ms before next batch...');
          await new Promise(r => setTimeout(r, 500));
        }
      }

      const propsWithEdge = Object.values(newProps).filter(p => p.edgeType !== 'NONE');
      console.log(`[GameContext] ✅ Scan complete! Found ${Object.keys(newProps).length} props, ${propsWithEdge.length} with edge`);

      setProps(prev => ({ ...prev, ...newProps }));
      setLastError(null);

    } catch (err) {
      console.error("[GameContext] ❌ Scan error:", err);
      setLastError("Scan failed. Please try again.");
    }
  };


  // --------------------------------------------------------
  // SLIP MANAGEMENT
  // --------------------------------------------------------

  const createSlip = (type: 'POWER' | 'FLEX') => {
    const newSlip: Slip = {
      id: crypto.randomUUID(),
      selections: [],
      type,
      legCount: type === 'POWER' ? 2 : 3,
      payoutMultiplier: type === 'POWER' ? 3.0 : 2.25,
      status: 'DRAFT',
      createdAt: Date.now()
    };
    setSlips(prev => [...prev, newSlip]);
    setActiveSlipId(newSlip.id);
    setSlipAnalysis(null);
  };

  const addSelectionToSlip = (prop: PlayerPropItem, side: 'OVER' | 'UNDER') => {
    // Auto-create slip if none exists
    if (!activeSlipId) {
      const newSlip: Slip = {
        id: crypto.randomUUID(),
        selections: [],
        type: 'POWER',
        legCount: 2,
        payoutMultiplier: 3.0,
        status: 'DRAFT',
        createdAt: Date.now()
      };
      setSlips([newSlip]);
      setActiveSlipId(newSlip.id);
    }

    // Trigger team highlighting for correlation
    setHighlightTeam(prop.team);

    setSlips(prev => prev.map(slip => {
      if (slip.id === activeSlipId || (activeSlipId === undefined && slip.status === 'DRAFT')) {
        // Don't add duplicates
        if (slip.selections.some(s => s.id === prop.id)) return slip;
        const newSelection: SlipSelection = { ...prop, selectedSide: side };
        setSlipAnalysis(null);
        return { ...slip, selections: [...slip.selections, newSelection] };
      }
      return slip;
    }));
  };

  const removeSelectionFromSlip = (slipId: string, propId: string) => {
    setSlipAnalysis(null);
    setSlips(prev => prev.map(slip => {
      if (slip.id === slipId) {
        return { ...slip, selections: slip.selections.filter(s => s.id !== propId) };
      }
      return slip;
    }));
  };

  const analyzeCurrentSlip = async () => {
    if (!activeSlipId) return;
    const slip = slips.find(s => s.id === activeSlipId);
    if (!slip || slip.selections.length < 2) {
      console.warn("Need at least 2 selections to analyze");
      return;
    }

    setAnalysisLoading(true);
    try {
      const result = await analyzeSlip(slip);
      setSlipAnalysis(result);
    } catch (e) {
      console.error("Analysis failed", e);
      setSlipAnalysis({
        grade: '?',
        analysis: 'Analysis failed. Please try again.',
        correlationScore: 0,
        recommendation: 'Warning'
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  // --------------------------------------------------------
  // CONTEXT VALUE
  // --------------------------------------------------------
  const contextValue: PropLabState = {
    games,
    props,
    slips,
    activeSlipId,
    displayMode,
    minEdgeScore,
    slipAnalysis,
    analysisLoading,
    highlightTeam,
    addSelectionToSlip,
    removeSelectionFromSlip,
    createSlip,
    scanMarket,
    analyzeCurrentSlip,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = (): PropLabState => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGameContext must be used within GameProvider');
  return context;
};
