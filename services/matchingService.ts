/**
 * matchingService.ts - PrizePicks vs Sharp Comparison
 * 
 * Compares DFS lines (PrizePicks/Underdog) against Sharp bookmaker lines.
 * Calculates edge and recommends the optimal bet direction.
 */

import { PropLine, PlayerPropItem, PropMarketKey, SportKey } from '../types';

// DFS bookmaker keys
const DFS_BOOKS = ['prizepicks', 'underdog_fantasy'];

// Minimum edge threshold (in points) to consider a play
const MIN_EDGE_THRESHOLD = 0.5;

// --------------------------------------------------------------------------------
// GOBLIN/ALT LINE THRESHOLDS (Sport-Aware)
// If line diff exceeds this, it's likely a Goblin/Demon alt line with bad payouts
// --------------------------------------------------------------------------------
const GOBLIN_THRESHOLDS: Record<string, number> = {
    'player_points': 8,        // NBA points - higher variance
    'player_rebounds': 4,      // NBA rebounds
    'player_assists': 3,       // NBA assists
    'player_threes': 2,        // NBA threes
    'player_pass_yds': 40,     // NFL passing yards - huge range
    'player_rush_yds': 25,     // NFL rushing yards
    'player_reception_yds': 20,// NFL receiving yards
    'player_receptions': 3,    // NFL receptions
    'player_pass_tds': 1.5,    // NFL passing TDs
};

// --------------------------------------------------------------------------------
// WIN PROBABILITY MULTIPLIERS
// Each point of edge translates to X% probability boost
// Based on historical distribution analysis
// --------------------------------------------------------------------------------
const EDGE_PROBABILITY_MULTIPLIERS: Record<string, number> = {
    'player_points': 3.5,      // ~3.5% per point for NBA pts
    'player_rebounds': 5.0,    // ~5% per rebound
    'player_assists': 5.0,     // ~5% per assist
    'player_threes': 8.0,      // ~8% per three (high variance)
    'player_pass_yds': 0.15,   // ~0.15% per passing yard
    'player_rush_yds': 0.25,   // ~0.25% per rushing yard
    'player_reception_yds': 0.25, // ~0.25% per receiving yard
    'player_receptions': 5.0,  // ~5% per reception
    'player_pass_tds': 15.0,   // ~15% per passing TD
};

// --------------------------------------------------------------------------------
// UTILITIES
// --------------------------------------------------------------------------------

export const normalizeName = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .replace(/\s(jr|sr|ii|iii|iv)$/, '')
        .trim();
};

/**
 * Returns null if no lines, preventing false edge detection
 */
const getConsensusLine = (lines: PropLine[]): number | null => {
    if (lines.length === 0) return null;
    const sum = lines.reduce((acc, l) => acc + l.point, 0);
    return Math.round((sum / lines.length) * 10) / 10;
};

/**
 * Calculate how much the sharp books agree with each other (0-100%)
 * Lower spread = higher agreement = more confidence
 */
const calculateSharpAgreement = (lines: PropLine[]): number => {
    if (lines.length < 2) return 100; // Single source = no disagreement

    const points = lines.map(l => l.point);
    const min = Math.min(...points);
    const max = Math.max(...points);
    const spread = max - min;

    // 0 spread = 100% agreement, 3+ spread = 0% agreement
    if (spread === 0) return 100;
    if (spread >= 3) return 0;
    return Math.round(100 - (spread / 3) * 100);
};

/**
 * Calculate acceptable line range based on sharp consensus
 */
const calculateAcceptableRange = (
    sharpConsensus: number,
    recommendedSide: 'OVER' | 'UNDER' | null
): { maxAcceptable: number | null; minAcceptable: number | null } => {
    if (!recommendedSide) {
        return { maxAcceptable: null, minAcceptable: null };
    }

    if (recommendedSide === 'OVER') {
        // For OVER: You want PP line LOWER than sharp
        // Max acceptable = sharp - minimum edge needed
        return {
            maxAcceptable: Math.round((sharpConsensus - MIN_EDGE_THRESHOLD) * 10) / 10,
            minAcceptable: null
        };
    } else {
        // For UNDER: You want PP line HIGHER than sharp
        // Min acceptable = sharp + minimum edge needed
        return {
            maxAcceptable: null,
            minAcceptable: Math.round((sharpConsensus + MIN_EDGE_THRESHOLD) * 10) / 10
        };
    }
};

/**
 * Estimates win probability based on line edge
 * 
 * KEY INSIGHT: We can't use sharp odds directly because those odds
 * are for THEIR line (e.g., 26.5), not the PP line (e.g., 24.5).
 * 
 * Instead, we estimate: baseline 50% + edge boost based on stat type.
 * 
 * Thresholds:
 * - 52.4% = Break-even on 5-Flex plays
 * - 54.25% = +EV Long Term (Golden Standard)
 * - 58.0% = +EV on 2-Man Power plays
 */
const estimateWinProbability = (
    ppLine: number,
    sharpLine: number,
    recommendedSide: 'OVER' | 'UNDER' | null,
    market: PropMarketKey
): number | null => {
    if (!recommendedSide) return null;

    const edge = Math.abs(sharpLine - ppLine);

    // Get multiplier for this stat type
    const multiplier = EDGE_PROBABILITY_MULTIPLIERS[market] || 3.0;
    const probabilityBoost = edge * multiplier;

    // Base probability is 50% (fair line), add boost from edge
    // Cap at reasonable bounds (50-75%) to avoid overconfidence
    const rawProbability = 50 + probabilityBoost;
    const cappedProbability = Math.min(75, Math.max(50, rawProbability));

    return Math.round(cappedProbability * 10) / 10;
};

/**
 * Generate human-readable guidance
 */
const generateGuidance = (
    ppLine: number,
    sharpConsensus: number,
    recommendedSide: 'OVER' | 'UNDER' | null,
    maxAcceptable: number | null,
    minAcceptable: number | null
): string => {
    if (!recommendedSide) return 'No clear edge detected';

    const currentEdge = Math.abs(sharpConsensus - ppLine);

    if (recommendedSide === 'OVER') {
        if (maxAcceptable !== null) {
            const buffer = maxAcceptable - ppLine;
            if (buffer > 1) {
                return `STRONG: Take OVER up to ${maxAcceptable}. Current line has ${currentEdge.toFixed(1)}pt edge.`;
            } else if (buffer > 0) {
                return `ACCEPTABLE: Line can move to ${maxAcceptable} max. Edge shrinking.`;
            } else {
                return `⚠️ LINE MOVED: Current ${ppLine} exceeds max ${maxAcceptable}. Pass.`;
            }
        }
    } else {
        if (minAcceptable !== null) {
            const buffer = ppLine - minAcceptable;
            if (buffer > 1) {
                return `STRONG: Take UNDER down to ${minAcceptable}. Current line has ${currentEdge.toFixed(1)}pt edge.`;
            } else if (buffer > 0) {
                return `ACCEPTABLE: Line can drop to ${minAcceptable} min. Edge shrinking.`;
            } else {
                return `⚠️ LINE MOVED: Current ${ppLine} below min ${minAcceptable}. Pass.`;
            }
        }
    }

    return `Edge: ${currentEdge.toFixed(1)} pts vs Sharp ${sharpConsensus}`;
};

interface EdgeResult {
    type: 'DISCREPANCY' | 'JUICE' | 'NONE';
    score: number;
    details: string;
}

/**
 * Calculates the EV/Edge based on Line Discrepancy or Juice.
 * Includes Goblin/Alt Line filtering with sport-aware thresholds.
 */
const calculateEdge = (dfsLine: PropLine, sharps: PropLine[], market: PropMarketKey): EdgeResult => {
    // Pinnacle is the gold standard, fall back to others
    const sharp = sharps.find(s => s.bookmakerKey === 'pinnacle') || sharps[0];

    if (!sharp) return { type: 'NONE', score: 0, details: "No sharp consensus" };

    const ppLine = dfsLine.point;
    const sharpLine = sharp.point;
    const sharpOdds = sharp.price;

    const diff = Math.abs(ppLine - sharpLine);

    // --- GOBLIN/DEMON FILTER (Sport-Aware) ---
    // Get threshold for this specific market, default to 5.0
    const goblinThreshold = GOBLIN_THRESHOLDS[market] || 5.0;

    if (diff > goblinThreshold) {
        return {
            type: 'NONE',
            score: 0,
            details: `Likely Alt/Goblin Line (${diff.toFixed(1)} pts diff > ${goblinThreshold} threshold). Ignoring.`
        };
    }
    // -----------------------------------------

    // 1. DISCREPANCY EDGE (Lines are different)
    if (diff >= 1.0) {
        return {
            type: 'DISCREPANCY',
            score: 90 + diff,
            details: `Discrepancy: PP ${ppLine} vs ${sharp.bookmaker} ${sharpLine}`
        };
    }

    if (diff > 0 && diff < 1.0) {
        return {
            type: 'DISCREPANCY',
            score: 80,
            details: `Small Discrepancy: PP ${ppLine} vs ${sharp.bookmaker} ${sharpLine}`
        };
    }

    // 2. JUICE EDGE (Lines are same, but Sharp is heavily juiced)
    if (diff === 0) {
        const isHeavyJuice = Math.abs(sharpOdds) >= 135;

        if (isHeavyJuice) {
            return {
                type: 'JUICE',
                score: 75 + (Math.abs(sharpOdds) - 130) / 2,
                details: `Juice Edge: ${sharp.bookmaker} has ${sharpOdds}`
            };
        }
    }

    return { type: 'NONE', score: 0, details: 'No significant edge' };
};

// --------------------------------------------------------------------------------
// MAIN MATCHING FUNCTION
// --------------------------------------------------------------------------------

/**
 * Matches DFS lines with Sharp lines and calculates edge + recommended side.
 */
export const matchAndFindEdges = (
    allLines: PropLine[],
    gameId: string,
    sport: SportKey,
    market: PropMarketKey
): PlayerPropItem[] => {
    // Group by normalized player name
    const playerGroups = new Map<string, { dfs: PropLine[], sharps: PropLine[] }>();

    for (const line of allLines) {
        const key = normalizeName(line.name);
        if (!playerGroups.has(key)) {
            playerGroups.set(key, { dfs: [], sharps: [] });
        }
        const group = playerGroups.get(key)!;
        if (DFS_BOOKS.includes(line.bookmakerKey)) {
            group.dfs.push(line);
        } else {
            group.sharps.push(line);
        }
    }

    const results: PlayerPropItem[] = [];

    for (const [normalizedName, group] of playerGroups.entries()) {
        // Get OVER lines only for comparison
        const dfsOvers = group.dfs.filter(l => l.label === 'Over');
        const sharpOvers = group.sharps.filter(l => l.label === 'Over');

        // Need at least one DFS line to show
        if (dfsOvers.length === 0) continue;

        const dfsLine = dfsOvers[0];
        const ppLine = dfsOvers.find(l => l.bookmakerKey === 'prizepicks') || dfsLine;

        // NULL-SAFE: Get sharp consensus
        const sharpConsensus = getConsensusLine(sharpOvers);
        const playerName = dfsLine.name;

        // Calculate sharp agreement
        const sharpAgreement = calculateSharpAgreement(sharpOvers);

        // Calculate edge
        let edgeType: 'DISCREPANCY' | 'JUICE' | 'NONE' = 'NONE';
        let edgeScore = 0;
        let edgeDetails = '';
        let recommendedSide: 'OVER' | 'UNDER' | null = null;
        let fairValue: number | null = sharpConsensus;
        let maxAcceptableLine: number | null = null;
        let minAcceptableLine: number | null = null;
        let edgeRemaining = 0;
        let winProbability: number | null = null;

        // Use calculateEdge helper with market for sport-aware thresholds
        if (sharpOvers.length > 0 && ppLine) {
            const edgeResult = calculateEdge(ppLine, sharpOvers, market);
            edgeType = edgeResult.type;
            edgeScore = edgeResult.score;
            edgeDetails = edgeResult.details;

            // If we have an edge, refine recommended side and score
            if (edgeType !== 'NONE') {
                const diff = (sharpConsensus || 0) - ppLine.point;
                recommendedSide = diff > 0 ? 'OVER' : 'UNDER';

                // Boost score if sharps agree
                if (edgeType === 'DISCREPANCY') {
                    edgeScore = Math.min(100, edgeScore + Math.round(sharpAgreement / 10));
                }
            }
        }

        // Only calculate acceptable ranges and win probability if we have sharp consensus
        if (sharpConsensus !== null && ppLine) {
            const diff = sharpConsensus - ppLine.point;

            // Calculate acceptable ranges
            const ranges = calculateAcceptableRange(sharpConsensus, recommendedSide);
            maxAcceptableLine = ranges.maxAcceptable;
            minAcceptableLine = ranges.minAcceptable;

            // Calculate remaining edge
            edgeRemaining = Math.abs(diff);

            // NEW: Calculate win probability based on edge
            winProbability = estimateWinProbability(
                ppLine.point,
                sharpConsensus,
                recommendedSide,
                market
            );

            // Generate detailed guidance
            if (recommendedSide) {
                edgeDetails = generateGuidance(
                    ppLine.point,
                    sharpConsensus,
                    recommendedSide,
                    maxAcceptableLine,
                    minAcceptableLine
                );
            }

        } else if (ppLine) {
            edgeDetails = 'No sharp lines available for comparison';
        }

        results.push({
            id: `${gameId}_${normalizedName}_${market}`,
            gameId,
            sport,
            playerId: normalizedName,
            playerName,
            market,
            team: 'TBD',
            opponent: 'TBD',

            prizePicksLine: ppLine,
            sharpLines: sharpOvers,

            edgeType,
            edgeScore,
            edgeDetails,
            recommendedSide,

            // Line Value Metrics
            fairValue,
            maxAcceptableLine,
            minAcceptableLine,
            edgeRemaining,
            sharpAgreement,
            winProbability,  // NEW

            aiInsight: undefined
        });
    }

    // Sort by edge score descending (best edges first)
    return results.sort((a, b) => b.edgeScore - a.edgeScore);
};

// Alias for backwards compatibility
export const groupSharpLines = matchAndFindEdges;
