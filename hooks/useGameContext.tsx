import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  PropLabState,
  PlayerPropItem,
  Slip,
  SlipSelection,
  GameEvent,
  PropMarketKey,
  Region
} from '../types';
import { supabase } from '../services/supabaseClient';
import {
  fetchUpcomingEvents,
  fetchPropsForGame,
  getSupportedMarkets
} from '../services/oddsService';
import { matchAndFindEdges } from '../services/matchingService';
import { analyzeSlip, SlipAnalysisResult } from '../services/geminiService';

const GameContext = createContext<PropLabState | undefined>(undefined);

const getTodayKey = () => new Date().toISOString().split('T')[0];

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

  const [isLoading, setIsLoading] = useState(false);

  // Analysis State
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [slipAnalysis, setSlipAnalysis] = useState<SlipAnalysisResult | null>(null);

  // --------------------------------------------------------
  // METHODS
  // --------------------------------------------------------

  /**
   * Initial Data Load (Events)
   */
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        // For now, hardcode sport or iterate. Let's start with NBA.
        const nbaGames = await fetchUpcomingEvents('basketball_nba');
        setGames(prev => [...prev.filter(g => g.sport_key !== 'basketball_nba'), ...nbaGames]);
      } catch (e) {
        console.error("Failed to load events", e);
      } finally {
        setIsLoading(false);
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
      } catch (e) {
        console.error("Failed to fetch events during scan", e);
        return;
      }
    }

    setIsLoading(true);
    console.log(`[Scan] Starting scan...`);

    try {
      const newProps: Record<string, PlayerPropItem> = {};

      await Promise.all(currentGames.map(async (game) => {
        const markets = getSupportedMarkets(game.sport_key);
        if (markets.length === 0) return;

        try {
          const allLines = await fetchPropsForGame(game.sport_key, game.id, markets, true);

          console.log(`[Debug] Game ${game.away_team} vs ${game.home_team}: Raw Lines Found = ${allLines.length}`);

          if (allLines.length === 0) {
            console.warn(`[Debug] No lines from API for ${game.id}`);
            return;
          }

          // PIVOT: Sharp-only mode - group all lines by player/market
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

      console.log(`[Scan] Complete. Found ${Object.keys(newProps).length} props.`);
      setProps(prev => ({ ...prev, ...newProps }));

    } catch (err) {
      console.error("[Scan] Error", err);
    } finally {
      setIsLoading(false);
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
      legCount: type === 'POWER' ? 2 : 3, // Defaults
      payoutMultiplier: type === 'POWER' ? 3.0 : 2.25,
      status: 'DRAFT',
      createdAt: Date.now()
    };
    setSlips(prev => [...prev, newSlip]);
    setActiveSlipId(newSlip.id);
    setSlipAnalysis(null); // Reset analysis
  };

  const addSelectionToSlip = (prop: PlayerPropItem, side: 'OVER' | 'UNDER') => {
    if (!activeSlipId) {
      createSlip('POWER');
    }

    setSlips(prev => prev.map(slip => {
      if (slip.id === activeSlipId || (activeSlipId === undefined && slip.status === 'DRAFT')) {
        if (slip.selections.some(s => s.id === prop.id)) return slip;
        const newSelection: SlipSelection = { ...prop, selectedSide: side };
        setSlipAnalysis(null); // Invalidate analysis on change
        return { ...slip, selections: [...slip.selections, newSelection] };
      }
      return slip;
    }));
  };

  const removeSelectionFromSlip = (slipId: string, propId: string) => {
    setSlipAnalysis(null); // Invalidate analysis on change
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
    if (!slip) return;

    setAnalysisLoading(true);
    try {
      const result = await analyzeSlip(slip);
      setSlipAnalysis(result);
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <GameContext.Provider value={{
      games,
      props,
      slips,
      activeSlipId,
      displayMode,
      minEdgeScore,
      addSelectionToSlip,
      removeSelectionFromSlip,
      createSlip,
      scanMarket,
      analyzeCurrentSlip,
      slipAnalysis,
      analysisLoading
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGameContext must be used within GameProvider');
  return context;
};
