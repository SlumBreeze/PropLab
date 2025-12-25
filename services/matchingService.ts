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

        // Only calculate edge if we have both PP line AND sharp consensus
        if (sharpConsensus !== null && ppLine) {
            const diff = sharpConsensus - ppLine.point;

            if (Math.abs(diff) >= 1.5) {
                edgeType = 'DISCREPANCY';
                edgeScore = Math.min(100, Math.round(Math.abs(diff) * 15));
                recommendedSide = diff > 0 ? 'OVER' : 'UNDER';

                // Boost score if sharps agree
                edgeScore = Math.min(100, edgeScore + Math.round(sharpAgreement / 10));

            } else if (Math.abs(diff) >= 0.5) {
                edgeType = 'JUICE';
                edgeScore = Math.min(60, Math.round(Math.abs(diff) * 20));
                recommendedSide = diff > 0 ? 'OVER' : 'UNDER';
            }

            // Calculate acceptable ranges
            const ranges = calculateAcceptableRange(sharpConsensus, recommendedSide);
            maxAcceptableLine = ranges.maxAcceptable;
            minAcceptableLine = ranges.minAcceptable;

            // Calculate remaining edge
            edgeRemaining = Math.abs(diff);

            // Generate detailed guidance
            edgeDetails = generateGuidance(
                ppLine.point,
                sharpConsensus,
                recommendedSide,
                maxAcceptableLine,
                minAcceptableLine
            );

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

            // NEW FIELDS
            fairValue,
            maxAcceptableLine,
            minAcceptableLine,
            edgeRemaining,
            sharpAgreement,

            aiInsight: undefined
        });
    }

    // Sort by edge score descending (best edges first)
    return results.sort((a, b) => b.edgeScore - a.edgeScore);
};

// Alias for backwards compatibility
export const groupSharpLines = matchAndFindEdges;
