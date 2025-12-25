import { SportKey, Region, PropMarketKey, GameEvent, PropLine } from '../types';

const API_KEY = process.env.ODDS_API_KEY || "c99ceaaa8dd6ba6be5d5293bfe7be3da";
const BASE_URL = 'https://api.the-odds-api.com/v4/sports';

// Cache Duration: 30 minutes for props (lines move fast, but we need to save credits)
// TODO: Make this configurable or smarter (e.g., 5 mins for live, 60 mins for tomorrow)
const CACHE_DURATION = 30 * 60 * 1000;

// Mapping for bookmaker names to standardized keys if needed
// The Odds API uses keys like 'prizepicks', 'fanduel', etc.
export const BOOKMAKER_KEYS = {
  PRIZEPICKS: 'prizepicks',
  UNDERDOG: 'underdog_fantasy',
  PINNACLE: 'pinnacle',
  FANDUEL: 'fanduel',
  DRAFTKINGS: 'draftkings',
  BETMGM: 'betmgm'
};

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

// Simple in-memory cache
const memoryCache: Record<string, CacheEntry<any>> = {};

const getStorageKey = (key: string) => `proplab_cache_${key}`;

// Generic Fetch with Caching
async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  forceRefresh = false
): Promise<T | null> {
  const now = Date.now();
  const storageKey = getStorageKey(key);

  // 1. Memory Cache
  if (!forceRefresh && memoryCache[key] && (now - memoryCache[key].timestamp < CACHE_DURATION)) {
    console.log(`[OddsService] Memory hit: ${key}`);
    return memoryCache[key].data;
  }

  // 2. Local Storage
  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as CacheEntry<T>;
        if (now - parsed.timestamp < CACHE_DURATION) {
          console.log(`[OddsService] Storage hit: ${key}`);
          memoryCache[key] = parsed; // Rehydrate memory
          return parsed.data;
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.warn("Cache parse error", e);
    }
  }

  // 3. Network Call
  console.log(`[OddsService] Fetching fresh: ${key}`);
  try {
    const data = await fetcher();

    // Save to caches
    if (data) {
      const entry = { timestamp: now, data };
      memoryCache[key] = entry;
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(entry));
      }
    }
    return data;
  } catch (err) {
    console.error(`[OddsService] Error fetching ${key}`, err);
    return null;
  }
}

// ------------------------------------------------------------------
// API METHODS
// ------------------------------------------------------------------

/**
 * Fetch Upcoming Games (Events) for a Sport
 * @param sport - The sport key (e.g., 'basketball_nba')
 * @param dateFilter - Optional ISO date string (YYYY-MM-DD). If provided, fetches games on that date.
 */
export const fetchUpcomingEvents = async (sport: SportKey, dateFilter?: string): Promise<GameEvent[]> => {
  const fetcher = async () => {
    let url = `${BASE_URL}/${sport}/events?apiKey=${API_KEY}`;

    // If date filter is provided, add commence time bounds
    if (dateFilter) {
      // Start of day (midnight)
      const startOfDay = `${dateFilter}T00:00:00Z`;
      // End of day (23:59:59)
      const endOfDay = `${dateFilter}T23:59:59Z`;
      url += `&commenceTimeFrom=${startOfDay}&commenceTimeTo=${endOfDay}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  };

  // Include date in cache key for proper invalidation
  const cacheKey = dateFilter ? `events_${sport}_${dateFilter}` : `events_${sport}`;
  const data = await fetchWithCache(cacheKey, fetcher);
  return data || [];
};

/**
 * Fetch Props for a specific Game
 * Queries both 'us' (Sharps) and 'us_dfs' (PrizePicks)
 */
export const fetchPropsForGame = async (
  sport: SportKey,
  gameId: string,
  markets: PropMarketKey[],
  forceRefresh = false
): Promise<PropLine[]> => {
  // We need to fetch regions separate or together? 
  // API allows comma separated regions: regions=us,us_dfs

  const marketStr = markets.join(',');
  const cacheKey = `odds_${gameId}_${marketStr}`;

  const fetcher = async () => {
    // Fetch both sharp books (us) AND DFS platforms (us_dfs = PrizePicks, Underdog)
    const url = `${BASE_URL}/${sport}/events/${gameId}/odds?apiKey=${API_KEY}&regions=us,us_dfs&markets=${marketStr}&oddsFormat=american`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return parseOddsResponseRaw(data);
  };

  const data = await fetchWithCache(cacheKey, fetcher, forceRefresh);
  return data || [];
};

// ------------------------------------------------------------------
// PARSING
// ------------------------------------------------------------------

/**
 * Convert raw Odds API response into flat PropLines
 */
function parseOddsResponseRaw(data: any): PropLine[] {
  // API returns a list of bookmakers, each with markets, each with outcomes
  // We want to flatten this into: { PlayerName, Market, Book, Line, Odds }

  const lines: PropLine[] = [];

  if (!data.bookmakers) return [];

  for (const book of data.bookmakers) {
    for (const market of book.markets) {
      // Market key: "player_points", etc.
      const marketKey = market.key as PropMarketKey;

      for (const outcome of market.outcomes) {
        // ACTUAL API FORMAT (fixed Dec 2024):
        // outcome: { name: "Over", description: "Donovan Mitchell", price: -115, point: 29.5 }
        // name = "Over" | "Under"
        // description = Player Name

        const label = outcome.name; // "Over" or "Under"
        if (label !== 'Over' && label !== 'Under') {
          continue; // Skip non-O/U outcomes
        }

        const playerName = outcome.description; // The actual player name
        if (!playerName) {
          continue; // Skip if no player name
        }

        lines.push({
          bookmaker: book.title,
          bookmakerKey: book.key,
          market: marketKey,
          name: playerName, // Player Name (from description)
          description: label, // Over/Under
          label: label as 'Over' | 'Under',
          point: outcome.point,
          price: outcome.price,
          timestamp: Date.now()
        });
      }
    }
  }
  return lines;
}

/**
 * Helper to get all supported prop markets for a sport
 * (This can be expanded)
 */
export const getSupportedMarkets = (sport: SportKey): PropMarketKey[] => {
  switch (sport) {
    case 'basketball_nba':
      return ['player_points', 'player_rebounds', 'player_assists', 'player_threes'];
    case 'americanfootball_nfl':
      // FIXED: Using correct Odds API market keys
      return ['player_pass_yds', 'player_rush_yds', 'player_reception_yds', 'player_pass_tds'];
    default:
      return ['player_points'];
  }
}
