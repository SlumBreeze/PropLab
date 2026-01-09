import { SlipSelection, GameEvent, SportKey } from '../types';

// --------------------------------------------------------------------------------
// CORRELATION MATRIX
// --------------------------------------------------------------------------------

export type CorrelationRule = {
  score: number;
  description: string;
};

// Key format: "MARKET1 + MARKET2" (alphabetical order)
const CORRELATION_RULES: Record<string, CorrelationRule> = {
  // --- NFL ---
  'player_pass_yds + player_reception_yds': { score: 0.65, description: 'Positive Correlation: QB/WR Stack' },
  'player_pass_tds + player_reception_yds': { score: 0.60, description: 'Positive Correlation: QB/WR Stack' },
  'player_pass_yds + player_receptions': { score: 0.55, description: 'Positive Correlation: QB/WR Stack' },
  // Negative NFL
  'player_rush_yds + player_rush_yds': { score: -0.70, description: 'Negative Correlation: Cannibalization Risk' },
  
  // --- NBA ---
  'player_assists + player_points': { score: 0.45, description: 'PG Assists + Teammate Points' },
  // Negative NBA
  'player_rebounds + player_rebounds': { score: -0.30, description: 'Competing for Rebounds' },
};

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
 * Detects positive correlations (stacks) in the slip.
 */
export const detectPositiveStacks = (selections: SlipSelection[]): CorrelationRule[] => {
  const stacks: CorrelationRule[] = [];
  for (let i = 0; i < selections.length; i++) {
    for (let j = i + 1; j < selections.length; j++) {
      const correlation = getPairCorrelation(selections[i], selections[j]);
      if (correlation && correlation.score > 0) {
        stacks.push(correlation);
      }
    }
  }
  return stacks;
};

/**
 * Detects negative correlations (cannibalization) in the slip.
 */
export const detectCannibalization = (selections: SlipSelection[]): CorrelationRule[] => {
  const alerts: CorrelationRule[] = [];
  for (let i = 0; i < selections.length; i++) {
    for (let j = i + 1; j < selections.length; j++) {
      const correlation = getPairCorrelation(selections[i], selections[j]);
      if (correlation && correlation.score < 0) {
        alerts.push(correlation);
      }
    }
  }
  return alerts;
};

/**
 * Calculates the overall slip grade (A-F).
 */
export const calculateSlipGrade = (selections: SlipSelection[]): 'A' | 'B' | 'C' | 'D' | 'F' => {
  const impact = calculateSlipCorrelation(selections);
  return impact.grade;
};

/**
 * Main Correlation Engine (Internal Logic)
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
  // Base score 50 (Neutral C).
  let finalScore = 50; 
  if (pairCount > 0) {
    finalScore += (totalScore * 50); // Adjusted scale to hit A/F thresholds easier
  }

  finalScore = Math.min(100, Math.max(0, finalScore));

  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
  if (finalScore >= 80) grade = 'A';
  else if (finalScore >= 65) grade = 'B';
  else if (finalScore >= 40) grade = 'C';
  else if (finalScore >= 20) grade = 'D';
  else grade = 'F';

  return {
    score: finalScore,
    details: details.length > 0 ? details : ['No significant correlation found'],
    grade
  };
};