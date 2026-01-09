import React, { useMemo } from 'react';
import { Slip, SlipAnalysisResult, CorrelationImpact } from '../types';
import { WIN_PROB_PROFITABLE, POWER_MULTIPLIERS, FLEX_MULTIPLIERS } from '../constants';

interface SlipSidebarProps {
  slip: Slip | undefined;
  onRemove: (propId: string) => void;
  onAnalyze: () => void;
  analysisResult: SlipAnalysisResult | null;
  correlationAnalysis: CorrelationImpact | null;
  isAnalysisLoading: boolean;
}

/**
 * SlipSidebar Component
 *
 * Right sidebar for slip management with correlation analysis and payout calculations.
 * Displays slip selections, correlation matrix, AI analysis results, and payout multipliers.
 *
 * @component
 * @example
 * ```tsx
 * <SlipSidebar
 *   slip={activeSlip}
 *   onRemove={(propId) => removeFromSlip(propId)}
 *   onAnalyze={() => analyzeSlip()}
 *   analysisResult={slipAnalysis}
 *   correlationAnalysis={correlationAnalysis}
 *   isAnalysisLoading={false}
 * />
 * ```
 */
export const SlipSidebar: React.FC<SlipSidebarProps> = ({ 
    slip, 
    onRemove, 
    onAnalyze, 
    analysisResult, 
    correlationAnalysis,
    isAnalysisLoading 
}) => {

    if (!slip || slip.selections.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center border-l border-white/5 bg-slate-900/20">
                <div className="text-4xl mb-4 opacity-30">🎫</div>
                <h3 className="text-sm font-bold text-slate-400 mb-1">Empty Slip</h3>
                <p className="text-xs text-slate-600">Click a prop to start building your winning slip.</p>
                <div className="mt-8 p-4 rounded-xl border border-slate-800 bg-slate-900/50 w-full opacity-60">
                    <div className="h-2 w-2/3 bg-slate-800 rounded mb-2"></div>
                    <div className="h-2 w-1/2 bg-slate-800 rounded"></div>
                </div>
            </div>
        );
    }

    // Payout Logic (Simplified)
    const getMultiplier = (count: number, type: 'POWER' | 'FLEX') => {
        if (type === 'POWER') return POWER_MULTIPLIERS[count] || 0;
        return FLEX_MULTIPLIERS[count] || 0;
    };

    // --- SLIP OPTIMIZER LOGIC ---
    // Based on "How to Beat PrizePicks With Math"
    const getImpliedOdds = (count: number, type: 'POWER' | 'FLEX') => {
        if (count === 2 && type === 'POWER') return -137; // Acceptable for Correlation
        if (count === 3 && type === 'POWER') return -141; // BAD
        if (count === 3 && type === 'FLEX') return -145;  // TERRIBLE
        if (count === 4 && type === 'POWER') return -128; // OK
        if (count === 4 && type === 'FLEX') return -130;  // MEH
        if (count === 5 && type === 'FLEX') return -119;  // GOLDEN STANDARD
        if (count === 6 && type === 'FLEX') return -118;  // BEST
        return 0;
    };

    const multiplier = getMultiplier(slip.selections.length, slip.type);

    // Calculate average win probability for the slip
    const selectionsWithProb = slip.selections.filter(s => s.winProbability !== null);
    const avgWinProb = selectionsWithProb.length > 0
        ? selectionsWithProb.reduce((sum, s) => sum + (s.winProbability || 0), 0) / selectionsWithProb.length
        : null;

    return (
        <div className="h-full flex flex-col border-l border-white/10 bg-slate-950/80 backdrop-blur-xl">
            {/* Header */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-400 tracking-wider">NEW SLIP</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${slip.type === 'POWER' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                        {slip.type}
                    </span>
                </div>
                <div className="flex items-baseline justify-between">
                    <h2 className="text-xl font-black text-white">
                        {slip.selections.length} Leg {slip.type === 'POWER' ? 'Power Play' : 'Flex Play'}
                    </h2>
                    {correlationAnalysis && (
                        <span className={`text-lg font-black ${correlationAnalysis.grade === 'A' ? 'text-emerald-400' : correlationAnalysis.grade === 'F' ? 'text-rose-400' : 'text-slate-400'}`}>
                            {correlationAnalysis.grade}
                        </span>
                    )}
                </div>

                {/* Correlation Score Banner */}
                {correlationAnalysis && (
                    <div className="mt-2 flex items-center gap-2">
                        <div className={`flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden`}>
                            <div
                                className={`h-full ${correlationAnalysis.score >= 80 ? 'bg-emerald-500' : correlationAnalysis.score >= 40 ? 'bg-yellow-500' : 'bg-rose-500'}`}
                                style={{ width: `${correlationAnalysis.score}%` }}
                            />
                        </div>
                        <span className={`text-xs font-bold ${correlationAnalysis.score >= 65 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {Math.round(correlationAnalysis.score)} CORR
                        </span>
                    </div>
                )}
            </div>

            {/* Selections List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* SHOW CORRELATION INSIGHTS IF ANY */}
                {correlationAnalysis && correlationAnalysis.details.length > 0 && correlationAnalysis.score !== 50 && (
                    <div className="mb-2 p-2 rounded bg-slate-900/80 border border-slate-800">
                        <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Correlation Matrix</div>
                        {correlationAnalysis.details.map((detail, i) => (
                            <div key={i} className="text-[10px] text-slate-300 flex items-center gap-1">
                                <span>{detail.includes('Positive') ? '🔗' : '⚠️'}</span> {detail}
                            </div>
                        ))}
                    </div>
                )}

                {slip.selections.map((sel) => (
                    <div key={sel.id} className="relative group bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-colors">
                        <button
                            onClick={() => onRemove(sel.id)}
                            className="absolute top-2 right-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            ✕
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                {sel.playerName.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-slate-200">{sel.playerName}</div>
                                <div className="text-[10px] text-slate-500">{sel.team} • {sel.market.split('_')[1]}</div>
                            </div>
                            {/* Win Prob Mini Badge */}
                            {sel.winProbability !== null && sel.winProbability >= WIN_PROB_PROFITABLE && (
                                <div className="text-[9px] font-bold text-amber-400">
                                    {sel.winProbability}%
                                </div>
                            )}
                        </div>
                        <div className="mt-2 flex items-center justify-between bg-slate-950 rounded p-2">
                            <span className={`text-xs font-bold ${sel.selectedSide === 'OVER' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {sel.selectedSide} {sel.prizePicksLine?.point}
                            </span>
                            <span className="text-[10px] text-slate-600">
                                vs Sharp {sel.sharpLines[0]?.point || '-'}
                            </span>
                        </div>
                    </div>
                ))}

                {/* AI ANALYSIS RESULT */}
                {analysisResult && (
                    <div className={`mt-4 p-3 border rounded-xl relative overflow-hidden backdrop-blur-md ${analysisResult.recommendation === 'Submit'
                        ? 'bg-emerald-950/40 border-emerald-500/30'
                        : 'bg-rose-950/40 border-rose-500/30'
                        }`}>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">AI INSIGHT</h4>
                            <span className={`text-xs font-black px-1.5 py-0.5 rounded ${analysisResult.grade === 'A' || analysisResult.grade === 'B' ? 'bg-emerald-500 text-black' :
                                'bg-rose-500 text-white'
                                }`}>
                                GRADE {analysisResult.grade}
                            </span>
                        </div>

                        <p className="text-xs text-slate-200 leading-snug mb-2">{analysisResult.analysis}</p>

                        <div className={`text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1 ${analysisResult.recommendation === 'Submit'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                            }`}>
                            {analysisResult.recommendation === 'Submit' ? '✅ RECOMMEND SUBMIT' : '⚠️ WARNING DETECTED'}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Payout */}
            <div className="p-4 bg-slate-900 border-t border-white/5">

                {/* ANALYZE BUTTON */}
                <button
                    onClick={onAnalyze}
                    disabled={slip.selections.length < 2 || isAnalysisLoading}
                    className="w-full mb-3 py-2 rounded-lg bg-indigo-900/30 text-indigo-300 text-xs font-bold hover:bg-indigo-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isAnalysisLoading ? (
                        <>
                            <span className="animate-spin">↻</span> Analyzing...
                        </>
                    ) : (
                        <>✨ Analyze Slip</>
                    )}
                </button>

                <div className="flex justify-between items-end mb-4">
                    <div className="text-slate-400 text-xs">Payout ({multiplier}x)</div>
                    <div className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                        {multiplier > 0 ? `${multiplier}x` : '--'}
                    </div>
                </div>
                <button
                    disabled={multiplier === 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold shadow-lg shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                >
                    Place Slip
                </button>
            </div>
        </div>
    );
};
