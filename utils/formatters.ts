/**
 * Formats American odds with + prefix for positive values
 * @param odds - American odds number (e.g., -110, +150)
 * @returns Formatted string (e.g., "-110", "+150")
 */
export const formatOdds = (odds: number): string => {
  return odds > 0 ? `+${odds}` : `${odds}`;
};

/**
 * Formats a date string for display
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Formatted date (e.g., "Mon, Jan 8")
 */
export const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};
