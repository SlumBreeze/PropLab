import { GoogleGenAI } from "@google/genai";
import { Slip, SlipAnalysisResult } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_KEY;

if (!API_KEY) {
  console.warn("VITE_GEMINI_KEY is missing. AI analysis will not work.");
}

const genAI = new GoogleGenAI({ apiKey: API_KEY || "MISSING_KEY" });

const MODEL_NAME = "gemini-2.0-flash";

export const analyzeSlip = async (slip: Slip): Promise<SlipAnalysisResult> => {
  if (!slip || slip.selections.length === 0) {
    return { grade: 'N/A', analysis: 'Empty slip.', correlationScore: 0, recommendation: 'Warning' };
  }

  if (!API_KEY) {
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
   "correlationGrade": "A" | "B" | "C" | "D" | "F", 
   "analysis": "string (max 30 words). Mention Correlation if present, OR mention Value if that is the strength.", 
   "recommendation": "Submit" | "Warning",
   "correlationScore": number (0-100. High score for either high correlation OR high value).
}
`;

  try {
    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from Gemini");

    // Clean up response - remove markdown code blocks if present
    let cleanedText = text;
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    const data = JSON.parse(cleanedText);

    return {
      grade: data.correlationGrade || '?',
      analysis: data.analysis || 'No analysis',
      correlationScore: data.correlationScore || 0,
      recommendation: data.recommendation || 'Warning'
    };

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      grade: '?',
      analysis: 'AI Analysis Unavailable - check console for details',
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
