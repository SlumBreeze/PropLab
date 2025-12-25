import { GoogleGenAI, Type } from "@google/genai";
import { Slip, SlipSelection } from '../types';

// NOTE: Ensure API_KEY is set via Vite env (VITE_GEMINI_KEY).
const API_KEY = import.meta.env.VITE_GEMINI_KEY;

if (!API_KEY) {
  console.warn("VITE_GEMINI_KEY is missing. AI analysis will not work.");
}

const genAI = new GoogleGenAI({ apiKey: API_KEY || "MISSING_KEY" });

const MODEL_NAME = "gemini-3-flash-preview";

export interface SlipAnalysisResult {
  grade: string; // "A", "B", "C", "D", "F"
  analysis: string;
  correlationScore: number; // 0-100
  recommendation: 'Submit' | 'Warning';
}

export const analyzeSlip = async (slip: Slip): Promise<SlipAnalysisResult> => {
  if (!slip || slip.selections.length === 0) {
    return { grade: 'N/A', analysis: 'Empty slip.', correlationScore: 0, recommendation: 'Warning' };
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

     Output JSON with:
     { 
        "correlationGrade": "A" | "B" | "C" | "D" | "F", 
        "analysis": "string (max 30 words). Mention Correlation if present, OR mention Value if that is the strength.", 
        "recommendation": "Submit" | "Warning",
        "correlationScore": number (0-100. High score for either high correlation OR high value).
     }
   `;

  try {
    // Using the newer SDK pattern: ai.models.generateContent
    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correlationGrade: { type: Type.STRING },
            analysis: { type: Type.STRING },
            correlationScore: { type: Type.NUMBER },
            recommendation: { type: Type.STRING }
          }
        },
        temperature: 0.2
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");

    const data = JSON.parse(text);

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
      analysis: 'AI Analysis Unavailable',
      correlationScore: 0,
      recommendation: 'Warning'
    };
  }
};
