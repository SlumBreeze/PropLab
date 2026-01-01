import React from 'react';
import { GameProvider } from './hooks/useGameContext';
import PropScout from './pages/PropScout';
import { ErrorBoundary } from './components/ErrorBoundary';

// Simple Layout Wrapper
const AppContent: React.FC = () => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
      <PropScout />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </ErrorBoundary>
  );
}
