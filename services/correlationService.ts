import { SlipSelection, GameEvent, SportKey } from '../types';

// --------------------------------------------------------------------------------
// CORRELATION MATRIX
// --------------------------------------------------------------------------------

type CorrelationRule = {
  score: number;
  description: string;
};

// Key format: "MARKET1 + MARKET2" (alphabetical order)
const CORRELATION_RULES: Record<string, CorrelationRule> = {
  // --- NFL ---
  'player_pass_yds + player_reception_yds': { score: 0.65, description: 'QB Passing + WR Receiving' },
  'player_pass_tds + player_reception_yds': { score: 0.60, description: 'QB TDs + WR Receiving' },
  'player_pass_yds + player_receptions': { score: 0.55, description: 'QB Passing + WR Receptions' },
  // Negative NFL
  'player_rush_yds + player_rush_yds': { score: -0.70, description: 'RB1 + RB2 Rushing (Cannibalization)' },
  
  // --- NBA ---
  'player_assists + player_points': { score: 0.45, description: 'PG Assists + Teammate Points' },
  // Negative NBA
  'player_rebounds + player_rebounds': { score: -0.30, description: 'Competing for Rebounds' },
};

// --------------------------------------------------------------------------------
// HELPERS
// --------------------------------------------------------------------------------

/**
 * Standardizes market names for correlation lookups.
 * e.g. "player_pass_yds" -> "PASS_YDS"
 * Not strictly needed if we use the exact market keys in the rules map, 
 * but useful if we want to group generic positions.
 * 
 * For this implementation, we will use the exact market keys from types.ts
 */

export interface CorrelationImpact {
  score: number;
  details: string[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Checks if two props are correlated.
 */
const getPairCorrelation = (s1: SlipSelection, s2: SlipSelection): CorrelationRule | null => {
  // 1. Must be same team or same game context
  // same team = positive correlation usually
  // opposing team = usually neutral or specific (e.g. QB vs QB shootout)
  
  const sameTeam = s1.team === s2.team;
  const sameGame = s1.gameId === s2.gameId;

  if (!sameGame) return null;

  // Construct key (alphabetical to handle order)
  const markets = [s1.market, s2.market].sort();
  const key = `${markets[0]} + ${markets[1]}`;

  // Direct rule lookup
  const rule = CORRELATION_RULES[key];

  if (rule) {
    // If they are on the SAME team, apply the rule directly
    if (sameTeam) {
       // Check if directions match (Over/Over or Under/Under)
       const sameDirection = s1.selectedSide === s2.selectedSide;
       
       // If rule is positive (stacking), we need same direction
       if (rule.score > 0) {
         return sameDirection ? rule : { score: -rule.score, description: `Inverse: ${rule.description}` };
       } 
       // If rule is negative (cannibalization), we actually WANT opposite directions
       else {
         return !sameDirection ? { score: Math.abs(rule.score), description: `Hedged: ${rule.description}` } : rule;
       }
    }
  }

  return null;
};

/**
 * Main Correlation Engine
 */
export const calculateSlipCorrelation = (selections: SlipSelection[]): CorrelationImpact => {
  if (selections.length < 2) {
    return { score: 0, details: ['Not enough legs'], grade: 'C' };
  }

  let totalScore = 0;
  const details: string[] = [];
  let pairCount = 0;

  // Compare every pair
  for (let i = 0; i < selections.length; i++) {
    for (let j = i + 1; j < selections.length; j++) {
      const s1 = selections[i];
      const s2 = selections[j];

      const correlation = getPairCorrelation(s1, s2);
      if (correlation) {
        totalScore += correlation.score;
        details.push(`${correlation.description} (${correlation.score > 0 ? '+' : ''}${correlation.score.toFixed(2)})`);
        pairCount++;
      }
    }
  }

  // Normalize/Grade
  // Base score 0. If we have positive correlations, it goes up.
  // We want a 0-100 scale roughly. 
  // 1 strong correlation (0.65) should be good.
  
  let finalScore = 50; // Start neutral
  if (pairCount > 0) {
    finalScore += (totalScore * 20); // Scale up
  }

  finalScore = Math.min(100, Math.max(0, finalScore));

  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
  if (finalScore >= 80) grade = 'A';
  else if (finalScore >= 65) grade = 'B';
  else if (finalScore >= 45) grade = 'C';
  else if (finalScore >= 30) grade = 'D';
  else grade = 'F';

  return {
    score: finalScore,
    details: details.length > 0 ? details : ['No significant correlation found'],
    grade
  };
};

/**
 * Game Script Checks
 * (Placeholder logic since we don't have live spreads/totals in GameEvent yet)
 */
export const checkGameScript = (game: GameEvent, selection: SlipSelection): string[] => {
  const warnings: string[] = [];
  
  // Example logic (if we had spread/total)
  // if (game.spread < -14 && selection.selectedSide === 'OVER' && selection.market.includes('points')) {
  //   warnings.push('⚠️ Blowout Risk: Starters may sit Q4');
  // }
  
  return warnings;
};
