import React from 'react';
import { PlayerPropItem } from '../types';
import { calculatePropLabScore, getScoreColor } from '../services/scoringService';
import { WIN_PROB_BREAKEVEN_5FLEX, WIN_PROB_PROFITABLE, WIN_PROB_POWER_PLAY } from '../constants';
import { formatOdds } from '../utils/formatters';

interface PropCardProps {
  item: PlayerPropItem;
  onAdd: (side: 'OVER' | 'UNDER') => void;
  onCheckSituation: () => void;
  isHighlighted?: boolean;
  isAnalyzing?: boolean;
}

/**
 * PropCard Component
 *
 * Displays a single player prop with comparison to sharp lines, situational context,
 * and PropLab Score. Includes verification badges, hit rate history, and line movement indicators.
 *
 * @component
 * @example
 * ```tsx
 * <PropCard
 *   item={playerPropItem}
 *   onAdd={(side) => handleAddToSlip(side)}
 *   onCheckSituation={() => handleAnalyze()}
 *   isHighlighted={false}
 * />
 * ```
 */
export const PropCard: React.FC<PropCardProps> = ({ item, onAdd, onCheckSituation, isHighlighted, isAnalyzing }) => {
    const {
        prizePicksLine,
        sharpLines,
        edgeType,
        edgeDetails,
        edgeScore,
        recommendedSide,
        fairValue,
        maxAcceptableLine,
        minAcceptableLine,
        sharpAgreement,
        winProbability,
        aiInsight
    } = item;

    // Determine edge styling
    let edgeColor = "border-slate-800";
    let glowEffect = "";

    if (edgeType === 'DISCREPANCY') {
        edgeColor = "border-emerald-500/50";
        glowEffect = "shadow-[0_0_15px_rgba(16,185,129,0.2)]";
    } else if (edgeType === 'JUICE') {
        edgeColor = "border-cyan-500/50";
        glowEffect = "shadow-[0_0_15px_rgba(6,182,212,0.2)]";
    }

    const ppLine = prizePicksLine?.point || 0;
    const sharpConsensus = sharpLines.length > 0
        ? (sharpLines.reduce((sum, l) => sum + l.point, 0) / sharpLines.length).toFixed(1)
        : '--';
    const primaryType = prizePicksLine?.market?.replace('player_', '').replace('_', ' ').toUpperCase() || "PROP";

    // Determine if line is still valid
    const isLineStillGood = recommendedSide === 'OVER'
        ? (maxAcceptableLine === null || ppLine <= maxAcceptableLine)
        : (minAcceptableLine === null || ppLine >= minAcceptableLine);

    // Win Probability Badge Logic
    const isProfitable = winProbability !== null && winProbability >= WIN_PROB_PROFITABLE;
    const isPowerPlayWorthy = winProbability !== null && winProbability >= WIN_PROB_POWER_PLAY;

    // Situational Data
    const sit = aiInsight?.situational;

    // Verification & History
    const { verification, history, lineMovement } = item;
    const isVetoed = verification && (
        verification.confidenceLevel === 'UNCERTAIN' ||
        !verification.isPlayerActive ||
        !verification.injuryVerified
    );

    // PROPLAB SCORE
    const propLabScore = calculatePropLabScore(item);
    const scoreColor = getScoreColor(propLabScore);

    return (
        <div className={`relative group backdrop-blur-sm border transition-all duration-300 hover:scale-[1.01] p-4 rounded-xl
            ${isHighlighted ? 'bg-indigo-900/30 ring-2 ring-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'bg-slate-900/40'}
            ${isVetoed ? 'grayscale opacity-70 border-slate-800' : edgeColor} ${glowEffect}`}>

            {/* VETO OVERLAY */}
            {isVetoed && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-xl backdrop-blur-[2px]">
                   <div className="bg-rose-950/90 border border-rose-500/50 px-3 py-2 rounded-lg text-center shadow-2xl">
                       <div className="text-xl mb-1">⚠️</div>
                       <div className="text-xs font-bold text-rose-200 uppercase">Vetoed</div>
                       <div className="text-[9px] text-rose-300">
                           {!verification?.isPlayerActive ? 'Player OUT/DNP' : 'Injury Concern'}
                       </div>
                   </div>
                </div>
            )}

            {/* Header: Player & Team */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-lg font-bold text-slate-100 leading-tight">{item.playerName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-400 font-medium tracking-wider">{item.team} • {primaryType}</p>
                        {/* Verification Badge */}
                        {verification && verification.confidenceLevel === 'VERIFIED' && (
                             <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-0.5">
                                 🛡️ Verified
                             </span>
                        )}
                    </div>
                </div>

                {/* SCORES COLUMN */}
                <div className="flex flex-col items-end gap-1">
                    {/* PROPLAB SCORE BADGE */}
                    <div className={`text-xl font-black ${scoreColor} leading-none flex items-center gap-1`}>
                        {propLabScore}
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pt-1">SCORE</span>
                    </div>

                    {/* HIT RATE BADGE */}
                    {history && (
                        <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            📊 {recommendedSide === 'OVER' ? Math.round(history.last10HitRate.over * 100) : Math.round(history.last10HitRate.under * 100)}% L10
                        </div>
                    )}
                </div>
            </div>

            {/* SITUATIONAL CONTEXT & LINE MOVEMENT */}
            {(sit || lineMovement) && (
                <div className="mb-3 bg-slate-950/50 rounded-lg p-2 border border-slate-800/50 space-y-2">
                    {/* SITUATIONAL */}
                    {sit && (
                        <>
                            <div className="flex justify-between items-center">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    sit.injuryStatus === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                }`}>{sit.injuryStatus}</span>
                                <span className={`text-[9px] font-bold ${
                                    sit.recentForm === 'HOT' ? 'text-orange-400' : sit.recentForm === 'COLD' ? 'text-blue-400' : 'text-slate-400'
                                }`}>{sit.recentForm === 'HOT' ? '🔥 HOT' : sit.recentForm === 'COLD' ? '❄️ COLD' : 'NORMAL'} FORM</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                <div>
                                    Matchup: <span className={`font-bold ${
                                        sit.matchupGrade === 'ELITE' ? 'text-purple-400' :
                                        sit.matchupGrade === 'BRUTAL' ? 'text-rose-400' : 'text-slate-200'
                                    }`}>{sit.matchupGrade === 'ELITE' ? '🎯 SMASH SPOT' : sit.matchupGrade}</span>
                                </div>
                                <div>{sit.restDays}d Rest</div>
                            </div>
                        </>
                    )}

                    {/* LINE MOVEMENT */}
                    {lineMovement && (
                        <div className="pt-2 border-t border-slate-800/50 flex justify-between items-center text-[10px]">
                            <span className="text-slate-500 font-bold uppercase">Line Move</span>
                            <div className="flex items-center gap-1">
                                <span className="text-slate-400">{lineMovement.openingLine}</span>
                                <span className="text-slate-600">→</span>
                                <span className={`font-bold ${
                                    lineMovement.direction === 'STEAM_OVER' ? 'text-emerald-400' :
                                    lineMovement.direction === 'STEAM_UNDER' ? 'text-rose-400' : 'text-slate-200'
                                }`}>{lineMovement.currentLine}</span>
                                {lineMovement.isRLM && <span className="ml-1 text-[8px] bg-purple-500/20 text-purple-300 px-1 rounded font-bold">RLM 🧠</span>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Context Button (if no data) */}
            {!sit && (
                <button
                    onClick={onCheckSituation}
                    disabled={isAnalyzing}
                    className="mb-3 w-full py-1 rounded bg-slate-800/50 hover:bg-slate-800 text-[10px] text-indigo-300 font-bold border border-indigo-500/20 transition-colors flex items-center justify-center gap-1"
                >
                    {isAnalyzing ? '...' : '🔍 Check Context'}
                </button>
            )}

            {/* PP vs Sharp Comparison */}
            <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 bg-purple-950/30 rounded-lg p-2 text-center border border-purple-500/30">
                    <div className="text-[10px] text-purple-400 uppercase font-bold mb-1">PrizePicks</div>
                    <div className="text-2xl font-black text-white">{ppLine}</div>
                </div>
                <div className="text-slate-600 font-bold text-lg">→</div>
                <div className="flex-1 bg-emerald-950/30 rounded-lg p-2 text-center border border-emerald-500/30">
                    <div className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Fair Value</div>
                    <div className="text-2xl font-black text-white">{fairValue ?? sharpConsensus}</div>
                </div>
            </div>

            {/* Acceptable Range Indicator */}
            {recommendedSide && (maxAcceptableLine || minAcceptableLine) && (
                <div className={`mb-3 p-2 rounded-lg text-xs ${isLineStillGood
                    ? 'bg-emerald-950/30 border border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-950/30 border border-rose-500/20 text-rose-300'
                    }`}>
                    {recommendedSide === 'OVER' ? (
                        <span>✓ Take OVER up to <strong>{maxAcceptableLine}</strong></span>
                    ) : (
                        <span>✓ Take UNDER down to <strong>{minAcceptableLine}</strong></span>
                    )}
                </div>
            )}

            {/* Recommended Bet Button */}
            {recommendedSide && isLineStillGood ? (
                <button
                    onClick={() => onAdd(recommendedSide)}
                    className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${recommendedSide === 'OVER'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-900/30 hover:scale-[1.02]'
                        : 'bg-gradient-to-r from-rose-600 to-pink-500 text-white shadow-lg shadow-rose-900/30 hover:scale-[1.02]'
                        }`}
                >
                    <span className="text-lg">{recommendedSide === 'OVER' ? '📈' : '📉'}</span>
                    TAKE {recommendedSide} {ppLine}
                    {isProfitable && <span className="text-amber-300">⚡</span>}
                </button>
            ) : recommendedSide && !isLineStillGood ? (
                <div className="w-full py-3 rounded-lg bg-slate-800 text-slate-500 text-sm text-center font-bold">
                    ⚠️ Line Moved - No Longer Valid
                </div>
            ) : (
                <div className="text-center py-2 text-slate-600 text-xs">No clear edge detected</div>
            )}

            {/* Edge Details */}
            {edgeDetails && (
                <div className="mt-3 text-[10px] text-slate-500 border-t border-slate-800/50 pt-2 flex items-center gap-1">
                    <span>⚡</span> {edgeDetails}
                </div>
            )}
        </div>
    );
};
