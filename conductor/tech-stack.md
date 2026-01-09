# Technology Stack

## Frontend
- **Framework:** React 19
- **Build Tool:** Vite
- **Language:** TypeScript
- **State Management:** React Context API
- **Styling:** Tailwind CSS

## Backend & Services
- **Backend-as-a-Service:** Supabase (Auth, Database, Client)
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Data Fetching:** The Odds API (Player Props & Market Lines)

## Quality Assurance
- **Testing Framework:** Vitest
- **Component Testing:** jsdom, @testing-library/react
- **Type Safety:** TypeScript (Strict Mode)
- **Schema Validation:** Zod

## Architecture Rules
* **State Management:** React Context (`useGameContext.tsx`) is the single source of truth for global slip/prop state.
* **Services:** All External API logic (Gemini, Odds API, Supabase) **must** reside in the `services/` directory (e.g., `geminiService.ts`).
* **Components:** Use strict functional components. Do not put business logic inside UI components.