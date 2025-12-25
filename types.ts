// Core Regions for Data Fetching
// 'us' = Sharp Books (Pinnacle, FanDuel, DraftKings)
// 'us_dfs' = PrizePicks, Underdog
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
  | 'player_pass_yds'       // NFL Passing Yards (Odds API uses abbreviation)
  | 'player_rush_yds'       // NFL Rushing Yards
  | 'player_reception_yds'  // NFL Receiving Yards
  | 'player_receptions'
  // Legacy keys (keep for backwards compat if any data uses them)
  | 'player_pass_yards'
  | 'player_rush_yards'
  | 'player_rec_yards'
  ;

// A single line from a bookmaker (The Odds API "Outcome")
export interface PropLine {
  bookmaker: string;     // "PrizePicks", "Pinnacle", "FanDuel"
  bookmakerKey: string;  // "prizepicks", "pinnacle"
  market: PropMarketKey;
  name: string;          // Player Name (as returned by that book)
  description?: string;  // Sometimes used for "Over" / "Under" depending on API structure
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

  // AI Context
  aiInsight?: AiInsight;
}

export interface AiInsight {
  correlation?: string; // "High positive correlation with [Teammate QB]"
  injuryNews?: string;  // "Primary defender [Name] is OUT"
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  lastUpdated: number;
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

  // 2, 3, 4, 5, 6
  legCount: number;

  // e.g. 3.0 for 2-man Power, 10.0 for 4-flex
  payoutMultiplier: number;

  status: 'DRAFT' | 'PLACED';
  createdAt: number;
}

// ------------------------------------------------------------------
// APP STATE
// ------------------------------------------------------------------

export interface ScanResult {
  lastUpdated: string;
  propsFound: number;
  edgesFound: number;
}

export interface PropLabState {
  // Raw Data Cache
  games: GameEvent[];
  props: Record<string, PlayerPropItem>; // Map by ID

  // User Slips
  slips: Slip[];
  activeSlipId?: string; // Currently being built

  // Settings
  displayMode: 'PROPS' | 'SLIPS';
  minEdgeScore: number;

  // Methods
  addSelectionToSlip: (prop: PlayerPropItem, side: 'OVER' | 'UNDER') => void;
  removeSelectionFromSlip: (slipId: string, propId: string) => void;
  createSlip: (type: 'POWER' | 'FLEX') => void;
}
