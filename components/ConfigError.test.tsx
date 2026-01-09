import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConfigError } from './ConfigError';
import React from 'react';

describe('ConfigError', () => {
  it('renders correctly with missing keys', () => {
    const missingKeys = ['VITE_GEMINI_KEY'];
    render(<ConfigError missingKeys={missingKeys} />);
    
    expect(screen.getByText(/Configuration Error/i)).toBeInTheDocument();
    expect(screen.getByText(/VITE_GEMINI_KEY/)).toBeInTheDocument();
  });
});
