/**
 * matchingService.ts - PrizePicks vs Sharp Comparison
 * 
 * Compares DFS lines (PrizePicks/Underdog) against Sharp bookmaker lines.
 * Calculates edge and recommends the optimal bet direction.
 */

import { PropLine, PlayerPropItem, PropMarketKey, SportKey } from '../types';

// DFS bookmaker keys
const DFS_BOOKS = ['prizepicks', 'underdog_fantasy'];

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

        const dfsLine = dfsOvers[0]; // Primary DFS line (PrizePicks preferred)
        const ppLine = dfsOvers.find(l => l.bookmakerKey === 'prizepicks') || dfsLine;

        // NULL-SAFE: Skip if no sharp data to compare against
        const sharpConsensus = getConsensusLine(sharpOvers);
        const playerName = dfsLine.name;

        // Calculate edge
        let edgeType: 'DISCREPANCY' | 'JUICE' | 'NONE' = 'NONE';
        let edgeScore = 0;
        let edgeDetails = '';
        let recommendedSide: 'OVER' | 'UNDER' | null = null;

        // Only calculate edge if we have both PP line AND sharp consensus
        if (sharpConsensus !== null && ppLine) {
            const diff = sharpConsensus - ppLine.point;

            // Positive diff = Sharps have HIGHER line = PP is lower = OVER is the play
            // Negative diff = Sharps have LOWER line = PP is higher = UNDER is the play

            if (Math.abs(diff) >= 1.5) {
                edgeType = 'DISCREPANCY';
                edgeScore = Math.min(100, Math.round(Math.abs(diff) * 15));
                recommendedSide = diff > 0 ? 'OVER' : 'UNDER';
                edgeDetails = `PP ${ppLine.point} vs Sharp ${sharpConsensus} → ${recommendedSide} (+${Math.abs(diff).toFixed(1)} edge)`;
            } else if (Math.abs(diff) >= 0.5) {
                edgeType = 'JUICE';
                edgeScore = Math.min(60, Math.round(Math.abs(diff) * 20));
                recommendedSide = diff > 0 ? 'OVER' : 'UNDER';
                edgeDetails = `${Math.abs(diff).toFixed(1)} pt variance → lean ${recommendedSide}`;
            }
        } else if (ppLine) {
            // Have PP line but no sharp data
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

            aiInsight: undefined
        });
    }

    // Sort by edge score descending (best edges first)
    return results.sort((a, b) => b.edgeScore - a.edgeScore);
};

// Alias for backwards compatibility
export const groupSharpLines = matchAndFindEdges;
