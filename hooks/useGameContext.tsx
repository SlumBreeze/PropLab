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
  getSupportedMarkets
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

  // --------------------------------------------------------
  // METHODS
  // --------------------------------------------------------

  /**
   * Initial Data Load (Events)
   */
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const nbaGames = await fetchUpcomingEvents('basketball_nba');
        setGames(prev => [...prev.filter(g => g.sport_key !== 'basketball_nba'), ...nbaGames]);
        setLastError(null);
      } catch (e) {
        console.error("Failed to load events", e);
        setLastError("Failed to load games. Check your connection.");
      }
    };
    loadEvents();
  }, []);

  /**
   * Scan Market: Fetches props for ALL games and finds edges
   * @param dateFilter - Optional ISO date (YYYY-MM-DD) to filter games for a specific day.
   */
  const scanMarket = async (dateFilter?: string) => {
    let currentGames = games;

    if (currentGames.length === 0 || dateFilter) {
      console.log(`[Scan] Fetching events${dateFilter ? ` for ${dateFilter}` : ''}...`);
      try {
        const [nba, nfl] = await Promise.all([
          fetchUpcomingEvents('basketball_nba', dateFilter),
          fetchUpcomingEvents('americanfootball_nfl', dateFilter)
        ]);
        currentGames = [...nba, ...nfl];
        setGames(currentGames);
        setLastError(null);
      } catch (e) {
        console.error("Failed to fetch events during scan", e);
        setLastError("Failed to fetch games. Try again.");
        return;
      }
    }

    console.log(`[Scan] Starting scan for ${currentGames.length} games...`);

    try {
      const newProps: Record<string, PlayerPropItem> = {};

      // Process games in batches to avoid overwhelming the API
      const BATCH_SIZE = 3;
      for (let i = 0; i < currentGames.length; i += BATCH_SIZE) {
        const batch = currentGames.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (game) => {
          const markets = getSupportedMarkets(game.sport_key);
          if (markets.length === 0) return;

          try {
            const allLines = await fetchPropsForGame(game.sport_key, game.id, markets, true);

            console.log(`[Debug] Game ${game.away_team} vs ${game.home_team}: Raw Lines Found = ${allLines.length}`);

            if (allLines.length === 0) {
              console.warn(`[Debug] No lines from API for ${game.id}`);
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
            console.warn(`[Scan] Failed game ${game.id}`, err);
          }
        }));

        // Small delay between batches to be nice to the API
        if (i + BATCH_SIZE < currentGames.length) {
          await new Promise(r => setTimeout(r, 200));
        }
      }

      console.log(`[Scan] Complete. Found ${Object.keys(newProps).length} props.`);
      setProps(prev => ({ ...prev, ...newProps }));
      setLastError(null);

    } catch (err) {
      console.error("[Scan] Error", err);
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

      // Add selection to the new slip
      const newSelection: SlipSelection = { ...prop, selectedSide: side };
      setSlips([{ ...newSlip, selections: [newSelection] }]);
      setSlipAnalysis(null);
      return;
    }

    setSlips(prev => prev.map(slip => {
      if (slip.id === activeSlipId) {
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
