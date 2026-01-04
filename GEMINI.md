# Gemini Project Context: PropLab

## Project Overview

**PropLab** is a React-based web application designed for Daily Fantasy Sports (DFS) players. Its primary goal is to identify betting "edges" by comparing lines from DFS platforms (like PrizePicks) against sharp bookmaker lines (like Pinnacle). It also utilizes **Google Gemini AI** to analyze betting slips for correlation and expected value (EV).

### Key Technologies
*   **Frontend:** React 19, Vite, TypeScript, Tailwind CSS.
*   **AI:** Google Gemini API (`@google/genai`) for slip analysis.
*   **Data:** Supabase for backend storage (inferred).
*   **APIs:**
    *   **The Odds API:** Fetches sports odds and player props.
    *   **Gemini API:** Analyzes slip correlation and value.

## Architecture & Core Concepts

### Directory Structure
*   `pages/PropScout.tsx`: The main application interface. Contains the dashboard, prop grid, and slip builder sidebar.
*   `services/`:
    *   `geminiService.ts`: Handles interactions with the Gemini API to grade slips.
    *   `oddsService.ts`: Fetches line data from The Odds API.
    *   `matchingService.ts`: Logic to match DFS props with Sharp lines to calculate edges.
    *   `supabaseClient.ts`: Supabase configuration and client.
*   `hooks/useGameContext.tsx`: Central state management (React Context) for props, slips, and user actions.
*   `types.ts`: TypeScript definitions for the domain models (`Slip`, `PlayerPropItem`, `PropLine`, etc.).

### Domain Models
*   **Prop:** A wager on a player's statistic (e.g., "Points", "Rebounds").
*   **Edge:** Calculated difference between the DFS line and the "Sharp" line.
    *   **Discrepancy:** Significant difference in the line value (e.g., 22.5 vs 24.5).
    *   **Juice:** Difference in the odds price (e.g., -110 vs -140).
*   **Slip:** A collection of 2-6 selections (Power Play or Flex Play).
*   **Win Probability:** Calculated probability of a bet winning based on sharp odds.

## Build & Run

### Prerequisites
*   Node.js
*   Environment Variables (create `.env.local`):
    *   `VITE_GEMINI_KEY`: Your Google Gemini API Key.
    *   `VITE_ODDS_API_KEY`: API Key for The Odds API.
    *   `VITE_SUPABASE_URL` & `VITE_SUPABASE_KEY`: Supabase credentials.

### Commands
| Command | Description |
| :--- | :--- |
| `npm install` | Install dependencies. |
| `npm run dev` | Start the local development server (Vite). |
| `npm run build` | Build the project for production. |
| `npm run preview` | Preview the production build locally. |

## Development Guidelines

### Coding Style
*   **Functional Components:** Use React functional components with Hooks.
*   **TypeScript:** Strict typing is encouraged. Use interfaces in `types.ts` for shared models.
*   **Tailwind:** Use utility classes for styling. `App.tsx` sets the global dark theme (`bg-slate-950`).
*   **Services:** Keep API logic isolated in the `services/` directory.

### AI Integration (Gemini)
*   The `geminiService.ts` file contains the prompt engineering logic.
*   **Prompt Strategy:** The prompt acts as a "DFS Value & Correlation Expert", evaluating slips based on correlation (e.g., QB/WR stacks) and value (EV).
*   **Output:** The model returns a JSON object with a grade (A-F), analysis text, and recommendation.

### Important Notes
*   **Hardcoded Keys:** Some API keys might be present in `vite.config.ts` or source files. **Security Warning:** Ensure these are moved to `.env` files for production to prevent exposure.
*   **Date Handling:** The app uses local dates for market scanning. Be aware of timezone differences when fetching games.
