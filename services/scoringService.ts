import { PlayerPropItem } from '../types';

/**
 * Calculates the Unified PropLab Confidence Score (0-100).
 * Combines Mathematical Edge, Win Probability, Situational Factors, History, Sharp Agreement, and Line Movement.
 */
export const calculatePropLabScore = (prop: PlayerPropItem): number => {
  let score = 50; // Base Score

  // 1. Mathematical Edge (0-100 scale, usually around 50-90)
  // We assume edgeScore is roughly probability-based or 0-100.
  // If edgeScore is high (e.g. 80), adding 80*0.3 = +24.
  score += (prop.edgeScore - 50) * 0.5; 

  // 2. Win Probability Boost
  // Threshold: 54.25% (Profitable).
  // Example: 58% win prob -> (58 - 54.25) * 2 = +7.5 points
  if (prop.winProbability && prop.winProbability > 54.25) {
    score += (prop.winProbability - 54.25) * 3;
  }

  // 3. Situational Modifiers
  if (prop.aiInsight?.situational) {
    const sit = prop.aiInsight.situational;
    
    // Form
    if (sit.recentForm === 'HOT') score += 5;
    if (sit.recentForm === 'COLD') score -= 10;
    
    // Matchup
    if (sit.matchupGrade === 'ELITE') score += 8;
    if (sit.matchupGrade === 'GOOD') score += 4;
    if (sit.matchupGrade === 'TOUGH') score -= 6;
    if (sit.matchupGrade === 'BRUTAL') score -= 12;
    
    // Rest / Schedule
    if (sit.isBackToBack) score -= 5;
    if (sit.gameScript === 'BLOWOUT_RISK') score -= 8;
    if (sit.gameScript === 'GARBAGE_TIME_UPSIDE') score += 3; // Maybe good for some backups?
    
    // Injury
    if (sit.injuryStatus === 'QUESTIONABLE' || sit.injuryStatus === 'GTD') score -= 5;
    if (sit.injuryStatus === 'OUT') score = 0; // Kill it
  }

  // 4. Historical Hit Rate
  // We look at the hit rate for the RECOMMENDED side.
  if (prop.history && prop.recommendedSide) {
    const hitRate = prop.recommendedSide === 'OVER' 
      ? prop.history.last10HitRate.over 
      : prop.history.last10HitRate.under;
    
    // hitRate is 0-1 (e.g. 0.70)
    if (hitRate >= 0.70) score += 10;
    else if (hitRate >= 0.60) score += 5;
    else if (hitRate <= 0.30) score -= 10; // Cold streak on this side
  }

  // 5. Sharp Agreement
  // If sharps agree (e.g. 90% consensus), boost confidence.
  // 50 is neutral.
  if (prop.sharpAgreement !== undefined) {
      score += (prop.sharpAgreement - 50) * 0.2;
  }

  // 6. Line Movement
  if (prop.lineMovement) {
    const lm = prop.lineMovement;
    
    // RLM is the strongest signal
    if (lm.isRLM) score += 15;

    // Steam Logic:
    // If Steam is OVER, and we like UNDER -> Bad (-10)
    // If Steam is OVER, and we like OVER -> Good (+5)
    if (lm.direction === 'STEAM_OVER') {
      if (prop.recommendedSide === 'UNDER') score -= 10;
      else if (prop.recommendedSide === 'OVER') score += 5;
    } else if (lm.direction === 'STEAM_UNDER') {
      if (prop.recommendedSide === 'OVER') score -= 10;
      else if (prop.recommendedSide === 'UNDER') score += 5;
    }
  }

  // Veto Checks (Hard Caps)
  if (prop.verification) {
      if (!prop.verification.isPlayerActive) return 0;
      if (prop.verification.confidenceLevel === 'UNCERTAIN') score = Math.min(score, 60); // Cap uncertainty
  }

  return Math.min(100, Math.max(0, Math.round(score)));
};

export const getScoreColor = (score: number): string => {
  if (score >= 85) return 'text-purple-400'; // Elite / Smash
  if (score >= 75) return 'text-emerald-400'; // Great
  if (score >= 60) return 'text-yellow-400'; // Good/Okay
  return 'text-slate-500'; // Avoid
};

export const getScoreBadgeColor = (score: number): string => {
  if (score >= 85) return 'bg-purple-500 text-white shadow-purple-500/50';
  if (score >= 75) return 'bg-emerald-500 text-black shadow-emerald-500/50';
  if (score >= 60) return 'bg-yellow-500 text-black shadow-yellow-500/50';
  return 'bg-slate-700 text-slate-400';
};
