import React, { useState } from 'react';
import { useGameContext } from '../hooks/useGameContext';
import { PlayerPropItem, Slip, SlipAnalysisResult } from '../types';

// --------------------------------------------------------------------------------
// UTILS & COMPONENTS
// --------------------------------------------------------------------------------

const formatOdds = (odds: number) => (odds > 0 ? `+${odds}` : `${odds}`);

// Win Probability Thresholds
const WIN_PROB_BREAKEVEN_5FLEX = 52.4;
const WIN_PROB_PROFITABLE = 54.25;
const WIN_PROB_POWER_PLAY = 58.0;

/**
 * Prop Card Component
 * Displays a single player prop with comparison to sharp lines.
 */
const PropCard: React.FC<{
    item: PlayerPropItem;
    onAdd: (side: 'OVER' | 'UNDER') => void;
    isHighlighted?: boolean;
}> = ({ item, onAdd, isHighlighted }) => {
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
        winProbability
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

    return (
        <div className={`relative group backdrop-blur-sm border transition-all duration-300 hover:scale-[1.01] p-4 rounded-xl
            ${isHighlighted ? 'bg-indigo-900/30 ring-2 ring-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'bg-slate-900/40'}
            ${edgeColor} ${glowEffect}`}>

            {/* Header: Player & Team */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-lg font-bold text-slate-100 leading-tight">{item.playerName}</h3>
                    <p className="text-xs text-slate-400 font-medium tracking-wider">{item.team} • {primaryType}</p>
                </div>

                {/* Badges Column */}
                <div className="flex flex-col items-end gap-1">
                    {/* WIN PROBABILITY BADGE - THE GOLDEN CROWN */}
                    {winProbability !== null && winProbability > 50 && (
                        <div className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ${isPowerPlayWorthy
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                                : isProfitable
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400'
                            }`}>
                            {winProbability}% Win
                            {isPowerPlayWorthy && <span>👑</span>}
                            {isProfitable && !isPowerPlayWorthy && <span>✓</span>}
                        </div>
                    )}

                    {/* Edge Type Badge */}
                    {edgeType !== 'NONE' && (
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${edgeType === 'DISCREPANCY'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            }`}>
                            {edgeType}
                        </div>
                    )}

                    {/* Sharp Agreement */}
                    {sharpAgreement !== undefined && sharpAgreement < 100 && (
                        <div className={`text-[9px] px-1.5 py-0.5 rounded ${sharpAgreement >= 80 ? 'text-emerald-400' :
                            sharpAgreement >= 50 ? 'text-yellow-400' : 'text-rose-400'
                            }`}>
                            {sharpAgreement}% consensus
                        </div>
                    )}
                </div>
            </div>

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

/**
 * Sidebar Slip Component
 */
const SlipSidebar: React.FC<{
    slip: Slip | undefined;
    onRemove: (propId: string) => void;
    onAnalyze: () => void;
    analysisResult: SlipAnalysisResult | null;
    isAnalysisLoading: boolean;
}> = ({ slip, onRemove, onAnalyze, analysisResult, isAnalysisLoading }) => {

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
        if (type === 'POWER') {
            return count === 2 ? 3 : count === 3 ? 5 : count === 4 ? 10 : 0;
        }
        return count === 3 ? 2.25 : count === 4 ? 5 : count === 5 ? 10 : count === 6 ? 25 : 0;
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
    const impliedOdds = getImpliedOdds(slip.selections.length, slip.type);
    const isOptimal = impliedOdds !== 0 && impliedOdds > -120; // Green if -119 or better

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
                <h2 className="text-xl font-black text-white">
                    {slip.selections.length} Leg {slip.type === 'POWER' ? 'Power Play' : 'Flex Play'}
                </h2>
                {/* Average Win Probability */}
                {avgWinProb !== null && (
                    <div className={`mt-2 text-xs font-bold ${avgWinProb >= WIN_PROB_PROFITABLE ? 'text-amber-400' : 'text-slate-500'}`}>
                        Avg Win Prob: {avgWinProb.toFixed(1)}% {avgWinProb >= WIN_PROB_PROFITABLE && '👑'}
                    </div>
                )}
            </div>

            {/* Selections List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

                {/* MATH WARNING BANNER */}
                {impliedOdds !== 0 && (
                    <div className={`mb-3 p-2 rounded text-[10px] text-center font-bold border ${isOptimal
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                        }`}>
                        {isOptimal
                            ? `⚡ OPTIMAL SLIP (${impliedOdds} implied odds)`
                            : `⚠️ SUB-OPTIMAL (${impliedOdds} odds). Try 5-Flex for best math.`}
                    </div>
                )}

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

// --------------------------------------------------------------------------------
// MAIN PAGE
// --------------------------------------------------------------------------------

const PropScout: React.FC = () => {
    const {
        props,
        addSelectionToSlip,
        removeSelectionFromSlip,
        slips,
        activeSlipId,
        scanMarket,
        analyzeCurrentSlip,
        slipAnalysis,
        analysisLoading,
        highlightTeam
    } = useGameContext();

    const [filter, setFilter] = useState<'ALL' | 'NBA' | 'NFL'>('ALL');
    const [isScanning, setIsScanning] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Date Selector State
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState<string>(today);

    // Convert props map to array, filter by sport and search, then sort by Edge Score
    // FIXED: Explicit type annotations for TypeScript
    const propList: PlayerPropItem[] = (Object.values(props) as PlayerPropItem[])
        .filter((p: PlayerPropItem) => {
            // Sport filter
            if (filter === 'NBA' && p.sport !== 'basketball_nba') return false;
            if (filter === 'NFL' && p.sport !== 'americanfootball_nfl') return false;

            // Search filter (case-insensitive player name match)
            if (searchQuery && !p.playerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;

            return true;
        })
        .sort((a: PlayerPropItem, b: PlayerPropItem) => b.edgeScore - a.edgeScore);

    const activeSlip = slips.find(s => s.id === activeSlipId);

    // Manual Scan Handler
    const handleScan = async () => {
        setIsScanning(true);
        await scanMarket(selectedDate);
        setIsScanning(false);
    };

    return (
        <div className="h-screen w-full bg-slate-950 text-slate-200 overflow-hidden flex">

            {/* Left Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Ambient Background */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="p-6 pb-2 z-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-1">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">Prop</span>
                            <span>Lab</span>
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">Identify Edges. Build Slips. Win.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* DATE SELECTOR */}
                        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800">
                            <button
                                onClick={() => setSelectedDate(today)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedDate === today ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setSelectedDate(tomorrow)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedDate === tomorrow ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                Tomorrow
                            </button>
                        </div>

                        {/* SCAN BUTTON */}
                        <button
                            onClick={handleScan}
                            disabled={isScanning}
                            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${isScanning
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
                                }`}
                        >
                            {isScanning ? (
                                <>
                                    <span className="animate-spin">↻</span> Scanning...
                                </>
                            ) : (
                                <>
                                    <span>⚡</span> Scan Market
                                </>
                            )}
                        </button>

                        {/* Filters */}
                        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800">
                            {['ALL', 'NBA', 'NFL'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f as 'ALL' | 'NBA' | 'NFL')}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filter === f ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* PLAYER SEARCH */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="🔍 Search player..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-48 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Prop Grid */}
                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    {propList.length === 0 && !isScanning ? (
                        <div className="flex flex-col items-center justify-center h-64 opacity-50">
                            <div className="text-4xl mb-4">🔍</div>
                            <p>No props found. Click "Scan Market" to start.</p>
                        </div>
                    ) : isScanning ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <div className="animate-spin text-4xl mb-4">⚡</div>
                            <p className="text-slate-400">Scanning markets...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {propList.map((prop: PlayerPropItem) => (
                                <PropCard
                                    key={prop.id}
                                    item={prop}
                                    onAdd={(side) => addSelectionToSlip(prop, side)}
                                    isHighlighted={highlightTeam === prop.team}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Sidebar - Slip Builder */}
            <div className="w-[340px] z-20 h-full flex-shrink-0">
                <SlipSidebar
                    slip={activeSlip}
                    onRemove={(pid) => activeSlipId && removeSelectionFromSlip(activeSlipId, pid)}
                    onAnalyze={analyzeCurrentSlip}
                    analysisResult={slipAnalysis}
                    isAnalysisLoading={analysisLoading}
                />
            </div>

        </div>
    );
};

export default PropScout;
