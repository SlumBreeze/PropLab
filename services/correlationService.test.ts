import { describe, it, expect } from 'vitest';
import { calculateSlipCorrelation } from './correlationService';
import { SlipSelection } from '../types';

// Helper to create mock selections
const createMockSelection = (
    id: string, 
    gameId: string, 
    team: string, 
    market: any, 
    side: 'OVER' | 'UNDER'
): SlipSelection => ({
  id,
  gameId,
  sport: 'americanfootball_nfl',
  playerId: `p-${id}`,
  playerName: `Player ${id}`,
  team,
  opponent: 'OPP',
  market,
  sharpLines: [],
  edgeType: 'NONE',
  edgeScore: 50,
  edgeDetails: '',
  selectedSide: side,
  // Add other required fields with dummy data
  fairValue: null,
  maxAcceptableLine: null,
  minAcceptableLine: null,
  edgeRemaining: 0,
  sharpAgreement: 50,
  winProbability: 50,
});

describe('correlationService', () => {
  describe('calculateSlipCorrelation', () => {
    it('should return low score and C grade for single selection', () => {
      const selections = [
        createMockSelection('1', 'game-1', 'KC', 'player_pass_yds', 'OVER')
      ];
      const result = calculateSlipCorrelation(selections);
      expect(result.grade).toBe('C');
      expect(result.score).toBe(0);
      expect(result.details).toContain('Not enough legs');
    });

    it('should identify positive correlation: QB Passing + WR Receiving (Same Team, Same Game, Over/Over)', () => {
      const selections = [
        createMockSelection('1', 'game-1', 'KC', 'player_pass_yds', 'OVER'),
        createMockSelection('2', 'game-1', 'KC', 'player_reception_yds', 'OVER')
      ];
      
      const result = calculateSlipCorrelation(selections);
      // Base 50 + (0.65 * 20) = 63
      expect(result.score).toBeGreaterThan(60);
      expect(result.details[0]).toContain('QB Passing + WR Receiving');
    });

    it('should identify negative correlation: RB1 + RB2 Rushing (Cannibalization) (Same Team, Same Game, Over/Over)', () => {
        const selections = [
          createMockSelection('1', 'game-1', 'DET', 'player_rush_yds', 'OVER'),
          createMockSelection('2', 'game-1', 'DET', 'player_rush_yds', 'OVER')
        ];
        
        const result = calculateSlipCorrelation(selections);
        // Base 50 + (-0.70 * 20) = 36
        expect(result.score).toBeLessThan(50);
        expect(result.details[0]).toContain('RB1 + RB2 Rushing (Cannibalization)');
    });
    
    it('should identify hedged negative correlation as positive: RB1 Over + RB2 Under', () => {
        const selections = [
          createMockSelection('1', 'game-1', 'DET', 'player_rush_yds', 'OVER'),
          createMockSelection('2', 'game-1', 'DET', 'player_rush_yds', 'UNDER')
        ];
        
        const result = calculateSlipCorrelation(selections);
        // Rule is -0.70. But since sides are different (Over vs Under), logic flips it.
        // It becomes "Hedged: ...", score becomes +0.70
        // Base 50 + (0.70 * 20) = 64
        expect(result.score).toBeGreaterThan(60);
        expect(result.details[0]).toContain('Hedged: RB1 + RB2 Rushing');
    });

    it('should ignore correlations from different games', () => {
      const selections = [
        createMockSelection('1', 'game-1', 'KC', 'player_pass_yds', 'OVER'),
        createMockSelection('2', 'game-2', 'BUF', 'player_reception_yds', 'OVER')
      ];
      
      const result = calculateSlipCorrelation(selections);
      expect(result.score).toBe(50); // Neutral
      expect(result.details).toEqual(['No significant correlation found']);
    });
  });
});
