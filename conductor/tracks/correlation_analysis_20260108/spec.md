# Specification: Correlation Analysis for SGP Synergies

## Overview
Implement a correlation engine that analyzes Same-Game Parlay (SGP) synergies within a betting slip. The engine should identify positive stacks (synergies) and cannibalization (negative correlation) to help users build mathematically optimal slips.

## Functional Requirements
*   **Positive Stack Identification:** Identify synergies between related players (e.g., QB Passing Over + WR Receiving Over).
*   **Cannibalization Alerts:** Identify negative correlations where selections compete for the same statistical volume (e.g., RB1 Rushing Over + RB2 Rushing Over).
*   **Correlation Grading:** Assign a grade (A-F) to the overall slip based on the collective correlation of all selections.
*   **Real-time Analysis:** Re-evaluate correlation whenever a selection is added to or removed from the active slip.

## Technical Constraints
*   Logic must reside in `services/correlationService.ts`.
*   Integration with `useGameContext.tsx` for real-time slip state.
*   Grades and analysis text must be consumable by the `SlipSidebar.tsx` component.

## Acceptance Criteria
*   The system correctly identifies a QB/WR stack in the same game as a positive correlation.
*   The system correctly identifies two RBs on the same team as a potential cannibalization risk.
*   A slip grade (A-F) is displayed in the UI based on the correlation analysis.
*   Unit tests in `correlationService.test.ts` verify the detection logic for at least 5 common scenarios.
