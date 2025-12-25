
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Manually load .env
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const API_KEY = process.env.VITE_GEMINI_KEY;
console.log("Using API Key:", API_KEY ? API_KEY.substring(0, 10) + "..." : "UNDEFINED");

if (!API_KEY) {
    console.error("ERROR: VITE_GEMINI_KEY is missing from .env");
    process.exit(1);
}

const genAI = new GoogleGenAI({ apiKey: API_KEY });

async function test() {
    const candidates = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro",
        "gemini-2.0-flash-exp",
        "gemini-1.0-pro"
    ];

    console.log("Starting Model Connection Tests...\n");

    for (const model of candidates) {
        console.log(`Testing [${model}]...`);
        try {
            const response = await genAI.models.generateContent({
                model: model,
                contents: "Hello",
            });
            console.log(`>>> SUCCESS with [${model}]!`);
            console.log("Response:", response.text);
            return; // Stop after first success
        } catch (e) {
            console.log(`XXX Failed [${model}]: ${e.status || e.message}`);
            if (e.status === 404) {
                console.log("    (Model not found or not supported)");
            } else if (e.status === 403) {
                console.log("    (Permission denied / Billing issue)");
            }
        }
        console.log("---");
    }

    console.log("\nAll models failed.");
}

test();
