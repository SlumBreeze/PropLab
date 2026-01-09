# Specification - Secure API Keys

## Overview
Secure sensitive API keys used in PropLab by migrating them from hardcoded source strings to environment variables managed via Vite's `import.meta.env` system.

## Functional Requirements
1.  **Key Migration:**
    *   Scan root directory (including `index.html`, `vite.config.ts`) and `src/` directory for hardcoded API key patterns (e.g., Google "AIza" keys, Odds API keys).
    *   Move identified keys to a local `.env` file.
    *   Create a `.env.example` template containing required keys with empty values.
2.  **Service Refactoring:**
    *   Update `services/geminiService.ts` to use `import.meta.env.VITE_GEMINI_KEY`.
    *   Update `services/oddsService.ts` to use `import.meta.env.VITE_ODDS_API_KEY`.
3.  **Environment Validation:**
    *   Implement a check in `useGameContext.tsx` to verify presence of required environment variables on startup.
    *   **User Experience (Hard Stop):** If keys are missing, the app must render a full-screen "Configuration Error" component, blocking access to the application until resolved.
4.  **Security Hygiene:**
    *   Ensure `.env` is listed in `.gitignore`.

## Non-Functional Requirements
*   **Type Safety:** Extend the `ImportMetaEnv` interface to include the new variables for full TypeScript support.
*   **Security:** Ensure no sensitive keys are accidentally committed during the migration process.

## Acceptance Criteria
*   [ ] A comprehensive scan confirms no hardcoded "AIza" or Odds API keys remain in `src/` or configuration files.
*   [ ] The application functions correctly when `.env` is populated.
*   [ ] The application displays a blocking error UI when either `VITE_GEMINI_KEY` or `VITE_ODDS_API_KEY` is missing.
*   [ ] `.env.example` exists in the project root.
*   [ ] `.env` is correctly ignored by Git.
