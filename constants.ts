export const SPORTS_CONFIG: Record<string, { label: string; icon: string }> = {
  basketball_nba: { label: 'NBA', icon: '🏀' },
  americanfootball_nfl: { label: 'NFL', icon: '🏈' },
};

export const COMMON_BOOKS = [
  "Pinnacle", "FanDuel", "DraftKings", "BetMGM",
  "Caesars", "Bet365", "BetRivers", "PointsBet"
];

// Win Probability Thresholds (used by PropCard and SlipSidebar)
export const WIN_PROB_BREAKEVEN_5FLEX = 52.4;
export const WIN_PROB_PROFITABLE = 54.25;
export const WIN_PROB_POWER_PLAY = 58.0;

// Payout Multipliers for PrizePicks
export const POWER_MULTIPLIERS: Record<number, number> = {
  2: 3,
  3: 5,
  4: 10,
};

export const FLEX_MULTIPLIERS: Record<number, number> = {
  3: 2.25,
  4: 5,
  5: 10,
  6: 25,
};
