# Implementation Plan - Secure API Keys

## Phase 1: Security Foundation & Audit
- [x] Task: Audit codebase for hardcoded keys and verify `.gitignore`
- [~] Task: Create `.env` and `.env.example` templates
- [~] Task: Define TypeScript interfaces for environment variables in `vite-env.d.ts`
- [ ] Task: Conductor - User Manual Verification 'Security Foundation & Audit' (Protocol in workflow.md)
- [ ] Task: Conductor - User Manual Verification 'Security Foundation & Audit' (Protocol in workflow.md)

## Phase 2: Service Refactoring (TDD)
- [ ] Task: Refactor `geminiService.ts` to use environment variables
    - [ ] Write tests to verify `geminiService` uses `VITE_GEMINI_KEY`
    - [ ] Update `geminiService.ts` implementation
- [ ] Task: Refactor `oddsService.ts` to use environment variables
    - [ ] Write tests to verify `oddsService` uses `VITE_ODDS_API_KEY`
    - [ ] Update `oddsService.ts` implementation
- [ ] Task: Conductor - User Manual Verification 'Service Refactoring' (Protocol in workflow.md)

## Phase 3: Runtime Validation & Error UI (TDD)
- [ ] Task: Create `ConfigError` component for hard-stop UI
    - [ ] Write tests for `ConfigError` component rendering
    - [ ] Implement `ConfigError.tsx`
- [ ] Task: Implement environment validation in `useGameContext.tsx`
    - [ ] Write tests verifying the application blocks rendering when keys are missing
    - [ ] Update `useGameContext.tsx` to perform validation and conditionally render `ConfigError`
- [ ] Task: Conductor - User Manual Verification 'Runtime Validation & Error UI' (Protocol in workflow.md)
