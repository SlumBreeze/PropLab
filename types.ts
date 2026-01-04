
export type Region = 'us' | 'us_dfs';

// Supported Sports on The Odds API
export type SportKey =
  | 'basketball_nba'
  | 'americanfootball_nfl'
  | 'icehockey_nhl'
  | 'basketball_ncaab'
  | 'americanfootball_ncaaf';

// The basic Game Event from The Odds API
export interface GameEvent {
  id: string; // The Odds API Game ID
  sport_key: SportKey;
  commence_time: string; // ISO 8601
  home_team: string;
  away_team: string;
}

// ------------------------------------------------------------------
// PROP MARKET DEFINITIONS
// ------------------------------------------------------------------

export type PropMarketKey =
  | 'player_points'
  | 'player_rebounds'
  | 'player_assists'
  | 'player_threes'
  | 'player_pass_tds'
  | 'player_pass_yds'
  | 'player_rush_yds'
  | 'player_reception_yds'
  | 'player_receptions';

// A single line from a bookmaker (The Odds API "Outcome")
export interface PropLine {
  bookmaker: string;     // "PrizePicks", "Pinnacle", "FanDuel"
  bookmakerKey: string;  // "prizepicks", "pinnacle"
  market: PropMarketKey;
  name: string;          // Player Name (as returned by that book)
  description?: string;  // Sometimes used for "Over" / "Under"
  label: 'Over' | 'Under';
  point: number;         // The line (e.g., 22.5)
  price: number;         // American odds (e.g., -115)
  timestamp: number;
}

// ------------------------------------------------------------------
// ANALYSIS & EV
// ------------------------------------------------------------------

export type EdgeType = 'DISCREPANCY' | 'JUICE' | 'NONE';

export interface PlayerPropItem {
  id: string; // unique internal ID (gameId + playerId + market)
  gameId: string;
  sport: SportKey;

  // Normalized Player Info
  playerId: string; // Normalized name (e.g. "lebron_james")
  playerName: string; // Display name
  team: string;
  opponent: string;

  market: PropMarketKey;

  // Primary Target (PrizePicks)
  prizePicksLine?: PropLine;

  // Comparison (Sharps)
  sharpLines: PropLine[];

  // Calculated EV Status
  edgeType: EdgeType;
  edgeScore: number; // 0-100 score for sorting
  edgeDetails: string; // "PP 22.5 vs PIN 24.5 (-110)"

  // Auto-calculated recommendation
  recommendedSide?: 'OVER' | 'UNDER' | null;

  // NEW: Line Value Metrics
  fairValue: number | null;        // Sharp consensus (the "true" line)
  maxAcceptableLine: number | null; // For OVER plays: don't take above this
  minAcceptableLine: number | null; // For UNDER plays: don't take below this
  edgeRemaining: number;           // How much edge is left at current line
  sharpAgreement: number;          // 0-100% how much sharps agree with each other
  winProbability: number | null;   // Estimated win % based on edge (>54.25 = +EV)

  targetLine?: number;
  // AI Context
  aiInsight?: AiInsight;

  // Verification & History
  verification?: PropVerification;
  history?: PlayerPropHistory;
  
  // Line Movement
  lineMovement?: LineMovement;
}

export interface LineMovement {
  openingLine: number;
  currentLine: number;
  movement: number;          // +2.5 means line moved up
  direction: 'STEAM_OVER' | 'STEAM_UNDER' | 'STABLE';
  isRLM: boolean;            // Reverse Line Movement (sharp signal)
  movementTimestamp: number;
}

export interface PropVerification {
  isPlayerActive: boolean;          // Confirmed in lineup
  injuryVerified: boolean;          // Cross-checked injury report
  minutesProjectionSource: string;  // Where did we get this?
  lastVerified: number;             // Timestamp
  confidenceLevel: 'VERIFIED' | 'PROJECTED' | 'UNCERTAIN';
}

export interface PlayerPropHistory {
  seasonHitRate: {
    over: number;   // % of games player hit OVER
    under: number;  // % of games player hit UNDER
    push: number;
  };
  last10HitRate: {
    over: number;
    under: number;
  };
  vsCurrentLine: {
    timesOver: number;   // How many times exceeded this specific line
    timesUnder: number;
    avgPerformance: number;  // Season avg for this stat
  };
  streakInfo: string;  // "Hit OVER in 7 of last 10"
}

export interface PlayerSituational {
  injuryStatus: 'HEALTHY' | 'QUESTIONABLE' | 'PROBABLE' | 'OUT' | 'GTD';
  recentForm: 'HOT' | 'COLD' | 'NORMAL';  // Last 5 games vs season avg
  restDays: number;                        // Days since last game
  isBackToBack: boolean;
  projectedMinutes: number | null;
  matchupGrade: 'ELITE' | 'GOOD' | 'NEUTRAL' | 'TOUGH' | 'BRUTAL';
  gameScript: 'BLOWOUT_RISK' | 'COMPETITIVE' | 'GARBAGE_TIME_UPSIDE';
}

export interface AiInsight {
  correlation?: string;
  injuryNews?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  lastUpdated: number;
  situational?: PlayerSituational;
}

// ------------------------------------------------------------------
// BETTING SLIPS
// ------------------------------------------------------------------

export interface SlipSelection extends PlayerPropItem {
  selectedSide: 'OVER' | 'UNDER';
}

export interface Slip {
  id: string;
  selections: SlipSelection[];
  type: 'POWER' | 'FLEX';
  legCount: number;
  payoutMultiplier: number;
  status: 'DRAFT' | 'PLACED';
  createdAt: number;
}

// ------------------------------------------------------------------
// SLIP ANALYSIS
// ------------------------------------------------------------------

export interface SlipAnalysisResult {
  grade: string;
  analysis: string;
  correlationScore: number;
  recommendation: 'Submit' | 'Warning';
}

// ------------------------------------------------------------------
// APP STATE (matches useGameContext)
// ------------------------------------------------------------------

export interface PropLabState {
  // Data
  games: GameEvent[];
  props: Record<string, PlayerPropItem>;
  slips: Slip[];
  activeSlipId?: string;

  // UI State
  displayMode: 'PROPS' | 'SLIPS';
  minEdgeScore: number;

  // Analysis State
  slipAnalysis: SlipAnalysisResult | null;
  analysisLoading: boolean;
  highlightTeam?: string | null;
  lastError?: string | null;

  // Actions
  addSelectionToSlip: (prop: PlayerPropItem, side: 'OVER' | 'UNDER') => void;
  removeSelectionFromSlip: (slipId: string, propId: string) => void;
  createSlip: (type: 'POWER' | 'FLEX') => void;
  scanMarket: (dateFilter?: string) => Promise<void>;
  analyzeCurrentSlip: () => Promise<void>;
  analyzePlayerSituation: (propId: string) => Promise<void>;
  clearError: () => void;
}
