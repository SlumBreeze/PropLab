import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as geminiService from './geminiService';

describe('Gemini Service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should handle missing API key in analyzeSlip', async () => {
    vi.stubEnv('VITE_GEMINI_KEY', '');
    
    // We need to re-import or use the module after stubbing if it captures the env at module load
    // However, vitest stubEnv might not work for module-level constants already evaluated.
    // Let's see how it behaves.
    
    const result = await geminiService.analyzeSlip({ selections: [{ playerName: 'Test' }] } as any);
    expect(result.grade).toBe('?');
    expect(result.analysis).toContain('missing API key');
  });

  it('should return null in fetchPlayerSituationalContext when API key is missing', async () => {
    vi.stubEnv('VITE_GEMINI_KEY', '');
    const result = await geminiService.fetchPlayerSituationalContext('Name', 'Team', 'Opp', 'NFL');
    expect(result).toBeNull();
  });
});
