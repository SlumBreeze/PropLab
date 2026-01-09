import React from 'react';

interface MarketFiltersProps {
  filter: 'ALL' | 'NBA' | 'NFL';
  onFilterChange: (filter: 'ALL' | 'NBA' | 'NFL') => void;
}

/**
 * MarketFilters Component
 *
 * Displays sport filter buttons (ALL/NBA/NFL) for filtering props by sport.
 *
 * @component
 * @example
 * ```tsx
 * <MarketFilters
 *   filter={filter}
 *   onFilterChange={setFilter}
 * />
 * ```
 */
export const MarketFilters: React.FC<MarketFiltersProps> = ({ filter, onFilterChange }) => {
  const filters: Array<'ALL' | 'NBA' | 'NFL'> = ['ALL', 'NBA', 'NFL'];

  return (
    <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800">
      {filters.map(f => (
        <button
          key={f}
          onClick={() => onFilterChange(f)}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            filter === f
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
};
