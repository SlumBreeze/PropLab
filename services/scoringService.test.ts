import { describe, it, expect } from 'vitest';
import { calculatePropLabScore, getScoreColor, getScoreBadgeColor } from './scoringService';
import { PlayerPropItem } from '../types';

// Helper to create a base mock prop
const createMockProp = (overrides: Partial<PlayerPropItem> = {}): PlayerPropItem => ({
  id: 'test-prop',
  gameId: 'game-1',
  sport: 'basketball_nba',
  playerId: 'player-1',
  playerName: 'Test Player',
  team: 'LAL',
  opponent: 'BOS',
  market: 'player_points',
  sharpLines: [],
  edgeType: 'NONE',
  edgeScore: 50,
  edgeDetails: '',
  recommendedSide: 'OVER',
  fairValue: null,
  maxAcceptableLine: null,
  minAcceptableLine: null,
  edgeRemaining: 0,
  sharpAgreement: 50,
  winProbability: 50,
  ...overrides,
});

describe('scoringService', () => {
  describe('calculatePropLabScore', () => {
    it('should return a baseline score of 50 for a neutral prop', () => {
      const prop = createMockProp();
      const score = calculatePropLabScore(prop);
      expect(score).toBe(50);
    });

    it('should increase score with high edgeScore', () => {
      const prop = createMockProp({ edgeScore: 80 }); // (80 - 50) * 0.5 = +15
      const score = calculatePropLabScore(prop);
      expect(score).toBe(65);
    });

    it('should boost score for high win probability', () => {
      const prop = createMockProp({ winProbability: 58.25 }); // (58.25 - 54.25) * 3 = 12
      const score = calculatePropLabScore(prop);
      expect(score).toBe(62);
    });

    it('should apply situational modifiers (HOT)', () => {
      const prop = createMockProp({
        aiInsight: {
          confidence: 'HIGH',
          lastUpdated: Date.now(),
          situational: {
            recentForm: 'HOT',
            injuryStatus: 'HEALTHY',
            restDays: 2,
            isBackToBack: false,
            projectedMinutes: 30,
            matchupGrade: 'NEUTRAL',
            gameScript: 'COMPETITIVE'
          }
        }
      });
      const score = calculatePropLabScore(prop);
      // Base 50 + HOT (+5) = 55
      expect(score).toBe(55);
    });

    it('should apply situational modifiers (BackToBack, TOUGH)', () => {
        const prop = createMockProp({
          aiInsight: {
            confidence: 'HIGH',
            lastUpdated: Date.now(),
            situational: {
              recentForm: 'NORMAL',
              injuryStatus: 'HEALTHY',
              restDays: 0,
              isBackToBack: true, // -5
              projectedMinutes: 30,
              matchupGrade: 'TOUGH', // -6
              gameScript: 'COMPETITIVE'
            }
          }
        });
        const score = calculatePropLabScore(prop);
        // Base 50 - 5 - 6 = 39
        expect(score).toBe(39);
      });

    it('should boost score for high historical hit rate', () => {
      const prop = createMockProp({
        recommendedSide: 'OVER',
        history: {
          seasonHitRate: { over: 0.5, under: 0.5, push: 0 },
          last10HitRate: { over: 0.8, under: 0.2 }, // >= 0.70 -> +10
          vsCurrentLine: { timesOver: 5, timesUnder: 5, avgPerformance: 20 },
          streakInfo: ''
        }
      });
      const score = calculatePropLabScore(prop);
      // Base 50 + 10 = 60
      expect(score).toBe(60);
    });

    it('should apply sharp agreement boost', () => {
      const prop = createMockProp({ sharpAgreement: 80 }); // (80 - 50) * 0.2 = +6
      const score = calculatePropLabScore(prop);
      expect(score).toBe(56);
    });

    it('should apply line movement signals (RLM)', () => {
        const prop = createMockProp({
            lineMovement: {
                isRLM: true, // +15
                openingLine: 20.5,
                currentLine: 20.5,
                movement: 0,
                direction: 'STABLE',
                movementTimestamp: Date.now()
            }
        });
        const score = calculatePropLabScore(prop);
        expect(score).toBe(65);
    });
    
    it('should return 0 if player is inactive', () => {
        const prop = createMockProp({
            verification: {
                isPlayerActive: false,
                injuryVerified: true,
                minutesProjectionSource: 'Rotowire',
                lastVerified: Date.now(),
                confidenceLevel: 'VERIFIED'
            }
        });
        const score = calculatePropLabScore(prop);
        expect(score).toBe(0);
    });
  });

  describe('getScoreColor', () => {
    it('should return purple for scores >= 85', () => {
      expect(getScoreColor(85)).toContain('text-purple');
    });
    it('should return emerald for scores >= 75', () => {
      expect(getScoreColor(75)).toContain('text-emerald');
    });
    it('should return yellow for scores >= 60', () => {
      expect(getScoreColor(60)).toContain('text-yellow');
    });
    it('should return slate for scores < 60', () => {
      expect(getScoreColor(59)).toContain('text-slate');
    });
  });
});
