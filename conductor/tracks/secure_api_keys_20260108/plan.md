# Implementation Plan - Secure API Keys

## Phase 1: Security Foundation & Audit [checkpoint: e14b99e]
- [x] Task: Audit codebase for hardcoded keys and verify `.gitignore`
- [x] Task: Create `.env` and `.env.example` templates
- [x] Task: Define TypeScript interfaces for environment variables in `vite-env.d.ts`
- [x] Task: Conductor - User Manual Verification 'Security Foundation & Audit' (Protocol in workflow.md)
- [ ] Task: Conductor - User Manual Verification 'Security Foundation & Audit' (Protocol in workflow.md)

## Phase 2: Service Refactoring (TDD) [checkpoint: ce92d07]
- [x] Task: Refactor `geminiService.ts` to use environment variables
    - [x] Write tests to verify `geminiService` uses `VITE_GEMINI_KEY`
    - [x] Update `geminiService.ts` implementation
- [x] Task: Refactor `oddsService.ts` to use environment variables
    - [x] Write tests to verify `oddsService` uses `VITE_ODDS_API_KEY`
    - [x] Update `oddsService.ts` implementation
- [x] Task: Conductor - User Manual Verification 'Service Refactoring' (Protocol in workflow.md)

## Phase 3: Runtime Validation & Error UI (TDD)
- [x] Task: Create `ConfigError` component for hard-stop UI
    - [x] Write tests for `ConfigError` component rendering
    - [x] Implement `ConfigError.tsx`
- [~] Task: Implement environment validation in `useGameContext.tsx`
    - [ ] Write tests verifying the application blocks rendering when keys are missing
    - [ ] Update `useGameContext.tsx` to perform validation and conditionally render `ConfigError`
- [ ] Task: Conductor - User Manual Verification 'Runtime Validation & Error UI' (Protocol in workflow.md)
