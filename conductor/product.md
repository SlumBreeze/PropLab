# Initial Concept
PropLab is a high-performance DFS (Daily Fantasy Sports) analytics engine designed to identify edges, track sharp movement, and build mathematically optimal slips.

## Target Audience
Professional DFS players seeking high-volume +EV edges.

## Problem Statement
The primary challenge addressed is the time-consuming nature of manual cross-referencing odds across multiple sportsbooks, which hinders the ability to quickly capitalize on market inefficiencies.

## Core Value Proposition
PropLab provides a competitive advantage through:
*   **Real-time "PropLab Score":** A proprietary confidence metric combining live market data with AI-driven situational analysis.
*   **Automated Slip Optimization:** Intelligent slip building with integrated correlation grading (A-F) to maximize payout probability.
*   **Market Intelligence:** Live tracking of "Steam" and Reverse Line Movement (RLM) signals to identify sharp money movement.

## Key Domain Models
* **Slip:** A collection of 2-6 player selections (Power Play vs. Flex Play).
* **Edge:** The mathematical discrepancy between the DFS line and the Sharp Bookmaker line.
* **EV (Expected Value):** Calculated based on the implied win probability relative to the payout multiplier.
