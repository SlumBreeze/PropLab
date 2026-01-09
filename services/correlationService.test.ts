import { describe, it, expect } from 'vitest';
import { calculateSlipGrade, detectPositiveStacks, detectCannibalization } from './correlationService';
import { Slip, SlipSelection } from '../types';

// Mock Data Helper
const createMockSelection = (
  id: string,
  playerId: string,
  team: string,
  position: 'QB' | 'WR' | 'RB',
  market: 'player_pass_yds' | 'player_reception_yds' | 'player_rush_yds',
  side: 'OVER' | 'UNDER'
): SlipSelection => ({
  id,
  gameId: 'game-1',
  sport: 'americanfootball_nfl',
  playerId,
  playerName: playerId.replace('_', ' '),
  team,
  opponent: 'OPP',
  market,
  selectedSide: side,
  edgeType: 'NONE',
  edgeScore: 0,
  edgeDetails: '',
  sharpLines: [],
  edgeRemaining: 0,
  sharpAgreement: 0,
  maxAcceptableLine: 0,
  minAcceptableLine: 0,
  fairValue: 0,
  winProbability: 0,
});

describe('Correlation Service', () => {
  describe('detectPositiveStacks', () => {
    it('should identify a QB Passing Over + WR Receiving Over stack as positive', () => {
      const selections: SlipSelection[] = [
        createMockSelection('1', 'patrick_mahomes', 'KC', 'QB', 'player_pass_yds', 'OVER'),
        createMockSelection('2', 'travis_kelce', 'KC', 'WR', 'player_reception_yds', 'OVER'),
      ];
      
      const result = detectPositiveStacks(selections);
      expect(result).toHaveLength(1);
      expect(result[0].description).toContain('Positive Correlation: QB/WR Stack');
    });

    it('should NOT identify a stack if players are on different teams', () => {
      const selections: SlipSelection[] = [
        createMockSelection('1', 'patrick_mahomes', 'KC', 'QB', 'player_pass_yds', 'OVER'),
        createMockSelection('2', 'ja_marr_chase', 'CIN', 'WR', 'player_reception_yds', 'OVER'),
      ];

      const result = detectPositiveStacks(selections);
      expect(result).toHaveLength(0);
    });
  });

  describe('detectCannibalization', () => {
    it('should identify RB1 Rush Over + RB2 Rush Over as cannibalization (negative)', () => {
      const selections: SlipSelection[] = [
        createMockSelection('1', 'jahmyr_gibbs', 'DET', 'RB', 'player_rush_yds', 'OVER'),
        createMockSelection('2', 'david_montgomery', 'DET', 'RB', 'player_rush_yds', 'OVER'),
      ];

      const result = detectCannibalization(selections);
      expect(result).toHaveLength(1);
      expect(result[0].description).toContain('Negative Correlation: Cannibalization Risk');
    });
  });

  describe('calculateSlipGrade', () => {
    it('should return Grade A for a slip with strong positive correlation', () => {
      const selections: SlipSelection[] = [
        createMockSelection('1', 'patrick_mahomes', 'KC', 'QB', 'player_pass_yds', 'OVER'),
        createMockSelection('2', 'travis_kelce', 'KC', 'WR', 'player_reception_yds', 'OVER'),
      ];

      const grade = calculateSlipGrade(selections);
      expect(grade).toBe('A');
    });

    it('should return Grade F for a slip with cannibalization', () => {
       const selections: SlipSelection[] = [
        createMockSelection('1', 'jahmyr_gibbs', 'DET', 'RB', 'player_rush_yds', 'OVER'),
        createMockSelection('2', 'david_montgomery', 'DET', 'RB', 'player_rush_yds', 'OVER'),
      ];

      const grade = calculateSlipGrade(selections);
      expect(grade).toBe('F');
    });

     it('should return Grade C for a slip with no correlation', () => {
       const selections: SlipSelection[] = [
        createMockSelection('1', 'patrick_mahomes', 'KC', 'QB', 'player_pass_yds', 'OVER'),
        createMockSelection('2', 'lebron_james', 'LAL', 'RB', 'player_points', 'OVER'), // Different sport/game
      ];

      const grade = calculateSlipGrade(selections);
      expect(grade).toBe('C');
    });
  });
});