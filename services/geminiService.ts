import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { Slip, SlipAnalysisResult, PlayerSituational } from '../types';

const getGeminiApiKey = () => import.meta.env.VITE_GEMINI_KEY;

const getGenAI = () => {
  const apiKey = getGeminiApiKey();
  return new GoogleGenAI({ apiKey: apiKey || "MISSING_KEY" });
};

// Using a model that supports JSON mode well
const MODEL_NAME = "gemini-2.0-flash";

// ------------------------------------------------------------------
// ZOD SCHEMAS
// ------------------------------------------------------------------

const PlayerSituationalSchema = z.object({
  injuryStatus: z.enum(['HEALTHY', 'QUESTIONABLE', 'PROBABLE', 'OUT', 'GTD']),
  recentForm: z.enum(['HOT', 'COLD', 'NORMAL']),
  restDays: z.number(),
  isBackToBack: z.boolean(),
  projectedMinutes: z.number().nullable(),
  matchupGrade: z.enum(['ELITE', 'GOOD', 'NEUTRAL', 'TOUGH', 'BRUTAL']),
  gameScript: z.enum(['BLOWOUT_RISK', 'COMPETITIVE', 'GARBAGE_TIME_UPSIDE']),
});

const SlipAnalysisSchema = z.object({
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  analysis: z.string(),
  recommendation: z.enum(['Submit', 'Warning']),
  correlationScore: z.number(),
});

// ------------------------------------------------------------------
// SERVICES
// ------------------------------------------------------------------

export const fetchPlayerSituationalContext = async (
  playerName: string, 
  team: string, 
  opponent: string, 
  sport: string
): Promise<PlayerSituational | null> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const prompt = `
You are a Sports Injury & Situational Analyst for ${sport}.

Analyze the upcoming game for:
Player: ${playerName} (${team})
Opponent: ${opponent}

Address these specific questions:
1. Is ${playerName} playing tonight? Any injury concerns?
2. How has ${playerName} performed in last 5 games vs season average?
3. What's the defensive ranking of ${opponent} against this player's position?

Based on your knowledge (up to your cutoff) and general logic, output a JSON object strictly matching this schema:

{
  "injuryStatus": "HEALTHY" | "QUESTIONABLE" | "PROBABLE" | "OUT" | "GTD",
  "recentForm": "HOT" | "COLD" | "NORMAL",
  "restDays": number,
  "isBackToBack": boolean,
  "projectedMinutes": number | null,
  "matchupGrade": "ELITE" | "GOOD" | "NEUTRAL" | "TOUGH" | "BRUTAL",
  "gameScript": "BLOWOUT_RISK" | "COMPETITIVE" | "GARBAGE_TIME_UPSIDE"
}
`;

  try {
    const genAI = getGenAI();
    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from Gemini");

    const data = JSON.parse(text);
    
    // Validate with Zod
    const validatedData = PlayerSituationalSchema.parse(data);
    return validatedData as PlayerSituational;

  } catch (error) {
    console.error("Gemini Situational Analysis Failed:", error);
    return null;
  }
};

export const analyzeSlip = async (slip: Slip): Promise<SlipAnalysisResult> => {
  if (!slip || slip.selections.length === 0) {
    return { grade: 'N/A', analysis: 'Empty slip.', correlationScore: 0, recommendation: 'Warning' };
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      grade: '?',
      analysis: 'AI analysis unavailable - missing API key',
      correlationScore: 0,
      recommendation: 'Warning'
    };
  }

  const selectionsText = slip.selections.map(s =>
    `- ${s.playerName} (${s.team}) ${s.selectedSide} ${s.prizePicksLine?.point} ${s.market}. [Context: ${s.edgeDetails || 'No edge info'}]`
  ).join('\n');

  const prompt = `
You are a DFS Value & Correlation Expert.

Input: A list of selected props.
SLIP:
${selectionsText}

Task: 
Evaluate the slip based on TWO criteria:
1. CORRELATION: Do the plays help each other? (e.g. QB Over Passing + WR Over Receiving).
2. VALUE (EV): Is the play good vs the Sharp/Vegas line? Look at the [Context] provided. 
   - If we took Over 240.5 and Sharp is 246.5, that is MASSIVE VALUE.
   - If we took Under and Sharp is lower, that is VALUE.

Grading Rubric:
- GRADE A: Strong Correlation OR Massive Value (2+ point diff vs sharps).
- GRADE B: Weak Correlation OR Good Value (1+ point diff).
- GRADE C: No Correlation and Neutral Value.
- GRADE D/F: Negative Correlation OR Bad Value (Taking Over when Sharp is lower).

Respond with ONLY valid JSON (no markdown, no code blocks):
{
   "grade": "A" | "B" | "C" | "D" | "F", 
   "analysis": "string (max 30 words). Mention Correlation if present, OR mention Value if that is the strength.", 
   "recommendation": "Submit" | "Warning",
   "correlationScore": number (0-100. High score for either high correlation OR high value).
}
`;

  try {
    const genAI = getGenAI();
    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from Gemini");

    const data = JSON.parse(text);

    // Validate with Zod
    const validatedData = SlipAnalysisSchema.parse(data);

    return validatedData;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    // Return a safe fallback that matches the shape
    return {
      grade: '?',
      analysis: error instanceof Error ? `Analysis Failed: ${error.message}` : 'Analysis Failed',
      correlationScore: 0,
      recommendation: 'Warning'
    };
  }
};

// Helper to format odds for display (keeping this utility function)
export const formatOddsForDisplay = (odds: string | number): string => {
  const num = typeof odds === 'string' ? parseFloat(odds) : odds;
  if (isNaN(num)) return '-';
  return num > 0 ? `+${num}` : `${num}`;
};