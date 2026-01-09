# Plan: Implement Correlation Analysis for SGP Synergies

## Phase 1: Core Correlation Logic
*   [x] Task: Write unit tests for basic correlation detection (QB/WR, RB/RB) in `services/correlationService.test.ts`. 653069c
*   [x] Task: Implement `detectPositiveStacks` and `detectCannibalization` logic in `services/correlationService.ts`. 653069c
*   [x] Task: Implement `calculateSlipGrade` function to aggregate correlation signals into an A-F grade. 653069c
*   [ ] Task: Conductor - User Manual Verification 'Phase 1: Core Correlation Logic' (Protocol in workflow.md)

## Phase 2: Context Integration & UI
*   [ ] Task: Update `useGameContext.tsx` to include `correlationAnalysis` in the state, triggered by slip changes.
*   [ ] Task: Update `SlipSidebar.tsx` to display the correlation grade and specific synergy/alert messages.
*   [ ] Task: Verify end-to-end flow: adding correlated players updates the UI with the correct grade and analysis.
*   [ ] Task: Conductor - User Manual Verification 'Phase 2: Context Integration & UI' (Protocol in workflow.md)

## Phase 3: Finalization
*   [ ] Task: Run full test suite (`npm run test`) to ensure no regressions in scoring or matching services.
*   [ ] Task: Perform a final code review for adherence to "Architecture Rules" in `tech-stack.md`.
*   [ ] Task: Conductor - User Manual Verification 'Phase 3: Finalization' (Protocol in workflow.md)