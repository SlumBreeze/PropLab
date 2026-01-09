import React from 'react';

interface ConfigErrorProps {
  missingKeys: string[];
}

export const ConfigError: React.FC<ConfigErrorProps> = ({ missingKeys }) => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-white p-8">
      <div className="max-w-md w-full bg-slate-900 p-8 rounded-lg border border-red-500/30 shadow-xl text-center">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-red-500 mb-2">Configuration Error</h1>
        <p className="mb-6 text-slate-300">
          PropLab is missing critical environment variables required to run.
        </p>
        
        <div className="bg-slate-950 p-4 rounded text-left border border-slate-800 mb-6">
          <p className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">Missing Variables:</p>
          <ul className="space-y-1">
            {missingKeys.map(key => (
              <li key={key} className="text-red-400 font-mono text-sm flex items-center">
                <span className="mr-2">❌</span> {key}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="text-sm text-slate-400">
          <p>Please check your <code className="bg-slate-800 px-1 rounded text-slate-200">.env</code> file or environment settings.</p>
        </div>
      </div>
    </div>
  );
};
