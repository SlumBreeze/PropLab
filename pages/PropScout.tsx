import React, { useState } from 'react';
import { useGameContext } from '../hooks/useGameContext';
import { PlayerPropItem } from '../types';
import { PropCard } from '../components/PropCard';
import { SlipSidebar } from '../components/SlipSidebar';
import { MarketFilters } from '../components/MarketFilters';
import { WIN_PROB_PROFITABLE } from '../constants';
import { formatDateDisplay } from '../utils/formatters';

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
        analyzePlayerSituation,
        slipAnalysis,
        correlationAnalysis,
        analysisLoading,
        highlightTeam,
        lastError,
        clearError
    } = useGameContext();

    const [filter, setFilter] = useState<'ALL' | 'NBA' | 'NFL'>('ALL');
    const [isScanning, setIsScanning] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Calendar Date Picker State
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    // Smart default: if it's late (10 PM+), default to tomorrow
    const smartDefault = currentHour >= 22 ? tomorrow : today;
    const [selectedDate, setSelectedDate] = useState<string>(smartDefault);

    // Show warning if user selected today and it's evening (6 PM+)
    const showLateWarning = selectedDate === today && currentHour >= 18;

    // Format date for display
    const formatDateDisplay = (dateStr: string): string => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    // Convert props map to array, filter by sport and search, then sort by Edge Score
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
        console.log(`[PropScout] 🔍 Scanning for date: ${selectedDate}`);
        await scanMarket(selectedDate);
        setIsScanning(false);
    };

    // Count props with edge
    const propsWithEdge = propList.filter(p => p.edgeType !== 'NONE').length;

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
                        {/* CALENDAR DATE PICKER */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
                                <span className="text-lg">📅</span>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    min={today}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent text-sm text-white font-bold focus:outline-none cursor-pointer
                                        [&::-webkit-calendar-picker-indicator]:filter
                                        [&::-webkit-calendar-picker-indicator]:invert"
                                />
                                <span className="text-xs text-slate-500 hidden sm:inline">
                                    ({formatDateDisplay(selectedDate)})
                                </span>
                            </div>
                            {/* Late Warning Banner */}
                            {showLateWarning && (
                                <div className="mt-1 text-[10px] text-orange-400 font-medium">
                                    ⚠️ Some games may have already started
                                </div>
                            )}
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
                        <MarketFilters filter={filter} onFilterChange={setFilter} />

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

                {/* Stats Bar */}
                {propList.length > 0 && (
                    <div className="px-6 py-2 flex items-center gap-4 text-xs">
                        <span className="text-slate-500">
                            📊 <span className="text-white font-bold">{propList.length}</span> props loaded
                        </span>
                        <span className="text-slate-500">
                            ✨ <span className="text-emerald-400 font-bold">{propsWithEdge}</span> with edge
                        </span>
                        <span className="text-slate-500">
                            👑 <span className="text-amber-400 font-bold">
                                {propList.filter(p => p.winProbability && p.winProbability >= WIN_PROB_PROFITABLE).length}
                            </span> profitable
                        </span>
                    </div>
                )}

                {/* Error Banner */}
                {lastError && (
                    <div className="mx-6 mt-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <span className="text-xl">⚠️</span>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-red-200">Error</h3>
                            <p className="text-xs text-red-300">{lastError}</p>
                        </div>
                        <button
                            onClick={clearError}
                            className="ml-4 px-2 py-1 rounded-md bg-red-800/50 text-red-200 hover:bg-red-800/80 text-xs font-bold"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Prop Grid */}
                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    {propList.length === 0 && !isScanning ? (
                        <div className="flex flex-col items-center justify-center h-64 opacity-50">
                            <div className="text-4xl mb-4">🔍</div>
                            <p className="text-center">No props found.<br />Select a date and click "Scan Market" to start.</p>
                            <p className="text-xs text-slate-600 mt-2">Check browser console for API logs</p>
                        </div>
                    ) : isScanning ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <div className="animate-spin text-4xl mb-4">⚡</div>
                            <p className="text-slate-400">Scanning markets for {formatDateDisplay(selectedDate)}...</p>
                            <p className="text-xs text-slate-600 mt-2">Check console for progress</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {propList.map((prop: PlayerPropItem) => (
                                <PropCard
                                    key={prop.id}
                                    item={prop}
                                    onAdd={(side) => addSelectionToSlip(prop, side)}
                                    onCheckSituation={() => analyzePlayerSituation(prop.id)}
                                    isHighlighted={highlightTeam === prop.team}
                                    isAnalyzing={analysisLoading}
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
                    onRemove={(pid) => {
                        if (!activeSlipId) return;
                        removeSelectionFromSlip(activeSlipId, pid);
                    }}
                    onAnalyze={analyzeCurrentSlip}
                    analysisResult={slipAnalysis}
                    correlationAnalysis={correlationAnalysis}
                    isAnalysisLoading={analysisLoading}
                />
            </div>

        </div>
    );
};

export default PropScout;
