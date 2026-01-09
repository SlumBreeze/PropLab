import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameProvider } from './useGameContext';
import React from 'react';

// Mock ConfigError to verify it's rendered
vi.mock('../components/ConfigError', () => ({
  ConfigError: ({ missingKeys }: { missingKeys: string[] }) => (
    <div data-testid="config-error">
      Missing: {missingKeys.join(', ')}
    </div>
  )
}));

describe('GameProvider Environment Validation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_GEMINI_KEY', 'test_gemini');
    vi.stubEnv('VITE_ODDS_API_KEY', 'test_odds');
  });

  it('renders children when all keys are present', () => {
    render(
      <GameProvider>
        <div data-testid="child">App Content</div>
      </GameProvider>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByTestId('config-error')).not.toBeInTheDocument();
  });

  it('renders ConfigError when VITE_GEMINI_KEY is missing', () => {
    vi.stubEnv('VITE_GEMINI_KEY', '');
    
    render(
      <GameProvider>
        <div data-testid="child">App Content</div>
      </GameProvider>
    );
    
    expect(screen.getByTestId('config-error')).toBeInTheDocument();
    expect(screen.getByText(/VITE_GEMINI_KEY/)).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('renders ConfigError when VITE_ODDS_API_KEY is missing', () => {
    vi.stubEnv('VITE_ODDS_API_KEY', '');
    
    render(
      <GameProvider>
        <div data-testid="child">App Content</div>
      </GameProvider>
    );
    
    expect(screen.getByTestId('config-error')).toBeInTheDocument();
    expect(screen.getByText(/VITE_ODDS_API_KEY/)).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });
});
