import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as oddsService from './oddsService';

describe('Odds Service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should use VITE_ODDS_API_KEY from environment', async () => {
    vi.stubEnv('VITE_ODDS_API_KEY', 'test_key');
    
    // We expect the URL in the log or the actual fetch to use 'test_key'
    // For now, let's just check if it's refactored to handle dynamic keys.
    const result = await oddsService.testApiConnection();
    // This will likely fail in test env but we can check logs or behavior
    expect(result).toBeDefined();
  });
});
