import { SportKey, PropMarketKey, GameEvent, PropLine } from '../types';

// IMPORTANT: Replace with your actual API key if this one is exhausted
const API_KEY = "c99ceaaa8dd6ba6be5d5293bfe7be3da";
const BASE_URL = 'https://api.the-odds-api.com/v4/sports';

// Cache Duration: 5 minutes (reduced for fresher data)
const CACHE_DURATION = 5 * 60 * 1000;

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

// Generic Fetch with Caching + Better Error Handling
async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  forceRefresh = false
): Promise<{ data: T | null; error: string | null }> {
  const now = Date.now();
  const storageKey = getStorageKey(key);

  // 1. Memory Cache (skip if force refresh)
  if (!forceRefresh && memoryCache[key] && (now - memoryCache[key].timestamp < CACHE_DURATION)) {
    console.log(`[OddsService] Memory hit: ${key}`);
    return { data: memoryCache[key].data, error: null };
  }

  // 2. Local Storage (skip if force refresh)
  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as CacheEntry<T>;
        if (now - parsed.timestamp < CACHE_DURATION) {
          console.log(`[OddsService] Storage hit: ${key}`);
          memoryCache[key] = parsed;
          return { data: parsed.data, error: null };
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.warn("Cache parse error", e);
    }
  }

  // 3. Network Call
  console.log(`[OddsService] 🌐 Fetching fresh: ${key}`);
  try {
    const data = await fetcher();

    // Save to caches
    if (data) {
      const entry = { timestamp: now, data };
      memoryCache[key] = entry;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(entry));
        } catch (e) {
          console.warn("Failed to save to localStorage", e);
        }
      }
    }
    return { data, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown API error';
    console.error(`[OddsService] ❌ Error fetching ${key}:`, errorMessage);
    return { data: null, error: errorMessage };
  }
}

// ------------------------------------------------------------------
// API METHODS
// ------------------------------------------------------------------

/**
 * Fetch Upcoming Games (Events) for a Sport
 */
export const fetchUpcomingEvents = async (
  sport: SportKey,
  dateFilter?: string,
  forceRefresh = false
): Promise<GameEvent[]> => {
  const fetcher = async (): Promise<GameEvent[]> => {
    let url = `${BASE_URL}/${sport}/events?apiKey=${API_KEY}`;

    // If date filter provided, add time range
    // Format must be exactly YYYY-MM-DDTHH:MM:SSZ (no milliseconds)
    if (dateFilter) {
      const startOfDay = `${dateFilter}T00:00:00Z`;
      const endOfDay = `${dateFilter}T23:59:59Z`;
      url += `&commenceTimeFrom=${startOfDay}&commenceTimeTo=${endOfDay}`;
    }

    console.log(`[OddsService] 📡 Events URL: ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);

    const res = await fetch(url);

    // Log remaining requests
    const remaining = res.headers.get('x-requests-remaining');
    const used = res.headers.get('x-requests-used');
    console.log(`[OddsService] 📊 API Quota: ${remaining} remaining, ${used} used`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[OddsService] ❌ API Error Response:`, errorText);
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    console.log(`[OddsService] ✅ Found ${data.length} events for ${sport}`);
    return data;
  };

  const cacheKey = dateFilter ? `events_${sport}_${dateFilter}` : `events_${sport}`;
  const result = await fetchWithCache(cacheKey, fetcher, forceRefresh);

  if (result.error) {
    console.error(`Failed to fetch events for ${sport}:`, result.error);
  }

  return result.data || [];
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
  const marketStr = markets.join(',');
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `odds_${gameId}_${marketStr}_${today}`;

  const fetcher = async (): Promise<PropLine[]> => {
    const url = `${BASE_URL}/${sport}/events/${gameId}/odds?apiKey=${API_KEY}&regions=us,us_dfs&markets=${marketStr}&oddsFormat=american`;

    console.log(`[OddsService] 📡 Props URL: ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);

    const res = await fetch(url);

    // Log remaining requests
    const remaining = res.headers.get('x-requests-remaining');
    const used = res.headers.get('x-requests-used');
    if (remaining) {
      console.log(`[OddsService] 📊 API Quota: ${remaining} remaining, ${used} used`);
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[OddsService] ❌ API Error Response:`, errorText);
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const lines = parseOddsResponseRaw(data);
    console.log(`[OddsService] ✅ Parsed ${lines.length} lines for game ${gameId}`);

    // Debug: Show which books we got
    const books = [...new Set(lines.map(l => l.bookmakerKey))];
    console.log(`[OddsService] 📚 Books found: ${books.join(', ')}`);

    return lines;
  };

  const result = await fetchWithCache(cacheKey, fetcher, forceRefresh);

  if (result.error) {
    console.error(`Failed to fetch props for game ${gameId}:`, result.error);
  }

  return result.data || [];
};

// ------------------------------------------------------------------
// PARSING
// ------------------------------------------------------------------

function parseOddsResponseRaw(data: any): PropLine[] {
  const lines: PropLine[] = [];

  if (!data.bookmakers) {
    console.warn('[OddsService] ⚠️ No bookmakers in response');
    return [];
  }

  console.log(`[OddsService] 📖 Processing ${data.bookmakers.length} bookmakers`);

  for (const book of data.bookmakers) {
    for (const market of book.markets) {
      const marketKey = market.key as PropMarketKey;

      for (const outcome of market.outcomes) {
        const label = outcome.name;
        if (label !== 'Over' && label !== 'Under') {
          continue;
        }

        const playerName = outcome.description;
        if (!playerName) {
          continue;
        }

        lines.push({
          bookmaker: book.title,
          bookmakerKey: book.key,
          market: marketKey,
          name: playerName,
          description: label,
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
 */
export const getSupportedMarkets = (sport: SportKey): PropMarketKey[] => {
  switch (sport) {
    case 'basketball_nba':
      return ['player_points', 'player_rebounds', 'player_assists', 'player_threes'];
    case 'americanfootball_nfl':
      return ['player_pass_yds', 'player_rush_yds', 'player_reception_yds', 'player_receptions'];
    default:
      return ['player_points'];
  }
};

/**
 * Clear all cached data (useful for debugging)
 */
export const clearCache = () => {
  Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
  if (typeof window !== 'undefined') {
    Object.keys(localStorage)
      .filter(key => key.startsWith('proplab_cache_'))
      .forEach(key => localStorage.removeItem(key));
  }
  console.log('[OddsService] 🗑️ Cache cleared');
};

/**
 * Test API connection
 */
export const testApiConnection = async (): Promise<boolean> => {
  try {
    const url = `${BASE_URL}/?apiKey=${API_KEY}`;
    console.log('[OddsService] 🔌 Testing API connection...');
    const res = await fetch(url);

    const remaining = res.headers.get('x-requests-remaining');
    console.log(`[OddsService] 📊 API Quota Remaining: ${remaining}`);

    if (res.ok) {
      console.log('[OddsService] ✅ API connection successful!');
      return true;
    } else {
      console.error('[OddsService] ❌ API connection failed:', res.status);
      return false;
    }
  } catch (err) {
    console.error('[OddsService] ❌ API connection error:', err);
    return false;
  }
};
