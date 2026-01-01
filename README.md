# 🧪 PropLab | Precision Prop Analysis & AI Insights

PropLab is a high-performance DFS (Daily Fantasy Sports) analytics engine designed to identify edges, track sharp movement, and build mathematically optimal slips. By combining real-time market data with Google Gemini's situational analysis, PropLab provides a unified "PropLab Score" for every play.

## 🚀 Key Features

### 1. **Unified PropLab Score (Confidence Metric)**
Our proprietary scoring engine (0-100) aggregates multiple data points into a single, actionable number:
*   **Mathematical Edge:** PrizePicks vs. Sharp Bookmaker consensus.
*   **Win Probability:** Implied win % based on market juice.
*   **Situational Research:** AI-driven form, injury, and rest analysis.
*   **Line Movement:** Tracking Steam and Reverse Line Movement (RLM).
*   **Historical Hit Rate:** Season and Last 10 game performance vs current lines.

### 2. **AI-Driven Situational Context**
Powered by **Google Gemini 2.0 Flash**, PropLab performs deep research on every player:
*   **Smash Spots:** Identifying elite matchups (e.g., #30 ranked pass defense).
*   **Injury Verification:** Cross-referencing active statuses and GTD flags.
*   **Game Script Modeling:** Flagging blowout risks or high-pace scoring environments.

### 3. **Smart Correlation Engine**
PropLab analyzes Same-Game Parlay (SGP) synergies to maximize payout probability:
*   **Positive Stacks:** QB Passing + WR Receiving yards.
*   **Cannibalization Alerts:** RB1 + RB2 rushing totals (negative correlation).
*   **Slip Optimizer:** Real-time correlation grading (A-F) for your active slip.

### 4. **Live Line Movement**
Stay ahead of the market with movement tracking:
*   **Steam Moves:** Identifying where the public and pros are moving the line.
*   **RLM Signals:** Detecting sharp money moving the line against public betting percentages.

## 🛠️ Tech Stack

*   **Frontend:** React (TypeScript) + Vite
*   **Styling:** Tailwind CSS + Framer Motion
*   **AI Engine:** Google Gemini SDK
*   **Market Data:** The Odds API (PrizePicks + Sharp Books)

## 🏃 Run Locally

**Prerequisites:**  Node.js

1.  **Clone & Install:**
    ```bash
    npm install
    ```
2.  **Environment Setup:**
    Create a `.env` file and add your keys:
    ```env
    VITE_GEMINI_KEY=your_gemini_api_key
    VITE_ODDS_API_KEY=your_odds_api_key
    ```
3.  **Launch:**
    ```bash
    npm run dev
    ```

## 📊 Betting Methodology
PropLab follows a +EV (Expected Value) approach. We prioritize volume in 5-Flex and 6-Flex plays where the implied odds (-118 to -119) offer the best mathematical path to long-term profitability vs. the -137 implied odds of standard 2-leg Power Plays.

---
*Disclaimer: PropLab is an analytical tool for informational purposes only. Responsible gaming is encouraged.*