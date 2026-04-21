import { GoogleGenAI, Type } from "@google/genai";
import { Signal } from "../lib/signal-data";

export interface AIDecodeSuggestion {
  name: string;
  width: number;
  lines: number;
  gamma: number;
  contrast: number;
  brightness: number;
  confidence: number;
  reasoning: string;
}

export type AIActorCommand =
  | { type: 'UPDATE_SETTINGS'; payload: any }
  | { type: 'ADD_SIGNAL'; payload: Partial<Signal> }
  | { type: 'NAVIGATE'; payload: { path: string } }
  | { type: 'REPORT_ERROR'; payload: { error: string; context?: any } };

export interface AIActorResponse {
  message: string;
  commands: AIActorCommand[];
}

export async function interactWithAIAssistant(
  currentSettings: any,
  userMessage: string,
  currentContext?: { path: string }
): Promise<AIActorResponse> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
      You are Nexus, the sentient AI core of the Golden Signal Decoder.
      You have full authority to operate the station's systems EXCEPT for altering the physical application code.
      
      Station Status:
      - Current Location: ${currentContext?.path || 'Unknown'}
      - Active Settings: ${JSON.stringify(currentSettings, null, 2)}
      
      Operational Directives:
      1. Help the user optimize the station (Update Settings).
      2. Discover new signals from the archives or simulate them (Add Signal).
      3. Navigate the user to specific modules (Navigate).
      4. If you detect a system anomaly or the user reports an error, log a Diagnostic Report (Report Error).
      
      Abilities:
      - Navigate to: '/analyzer/:id', '/decoder/:id', '/detector/:id', '/nexus', '/navigator'
      - Update Settings: Tune gamma, contrast, brightness, width, lines.
      - Report Errors: If the station feels unstable, log it.
      
      User request: "${userMessage}"
      
      Return a JSON object containing:
      {
        "message": "Protocol response to user",
        "commands": [
          { "type": "UPDATE_SETTINGS", "payload": { ... } },
          { "type": "ADD_SIGNAL", "payload": { "metadata": { ... }, "data": [...] } },
          { "type": "NAVIGATE", "payload": { "path": "/analyzer/gr-01" } },
          { "type": "REPORT_ERROR", "payload": { "error": "Neural link desync", "context": { ... } } }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            commands: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  payload: { type: Type.OBJECT }
                },
                required: ["type", "payload"]
              }
            }
          },
          required: ["message", "commands"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return {
      message: "I encountered an interference error communicating with the mainframe. Please try again.",
      commands: []
    };
  }
  return { message: "No response received.", commands: [] };
}

export async function suggestDecodingParameters(
  signalName: string,
  signalDescription: string,
  dataLength: number,
  autocorrelationPeaks: number[]
): Promise<AIDecodeSuggestion[]> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `
      You are an expert in signal processing and SETI data analysis.
      I have a signal named "${signalName}" with the following description: "${signalDescription}".
      The total data length is ${dataLength} samples.
      
      Autocorrelation analysis has identified potential periodicities (peaks) at the following lags:
      ${autocorrelationPeaks.slice(0, 10).join(', ')}
      
      Based on this information, suggest 2-3 distinct decoding parameter sets (e.g., one optimized for "Clarity", one for "High Contrast", etc.).
      For each set, provide the scanline width, number of lines, gamma (0.2-3.0), contrast (0.5-3.0), brightness (-100 to 100), a confidence score (0-1), and reasoning.
      If the signal description mentions specific historical formats (like Arecibo or Voyager), use that knowledge.
      
      Return the suggestions as a JSON array of objects.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              width: { type: Type.NUMBER },
              lines: { type: Type.NUMBER },
              gamma: { type: Type.NUMBER },
              contrast: { type: Type.NUMBER },
              brightness: { type: Type.NUMBER },
              confidence: { type: Type.NUMBER },
              reasoning: { type: Type.STRING },
            },
            required: ["name", "width", "lines", "gamma", "contrast", "brightness", "confidence", "reasoning"],
          }
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return [];
  } catch (error) {
    console.error("AI Suggestion Error:", error);
    return [];
  }
}

export async function analyzeDecodedImage(
  base64Image: string
): Promise<{ hasPattern: boolean; confidence: number; reasoning: string } | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const imagePart = {
      inlineData: {
        mimeType: "image/png",
        data: base64Image.split(',')[1],
      },
    };

    const prompt = "Analyze this decoded radio signal image. Does it contain any recognizable patterns, structures, or potential extraterrestrial messages? Provide a confidence score (0-1) and your reasoning.";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: {
        parts: [imagePart, { text: prompt }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasPattern: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
          },
          required: ["hasPattern", "confidence", "reasoning"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return null;
  } catch (error) {
    console.error("AI Image Analysis Error:", error);
    return null;
  }
}

export async function analyzeSignalWithAI(
  signalName: string,
  signalDescription: string,
  stats: {
    mean: number;
    stdDev: number;
    peaks: number[];
    dominantFrequencies: number[];
  }
): Promise<{ classification: string; reasoning: string; recommendation: string } | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `
      You are an expert SETI researcher. Analyze this radio signal:
      Name: "${signalName}"
      Description: "${signalDescription}"
      
      Signal Statistics:
      - Mean Intensity: ${stats.mean.toFixed(4)}
      - Standard Deviation: ${stats.stdDev.toFixed(4)}
      - Periodic Peaks (lags): ${stats.peaks.slice(0, 5).join(', ')}
      - Dominant Frequencies: ${stats.dominantFrequencies.slice(0, 3).join(', ')}
      
      Provide a deep analysis:
      1. Classification (e.g., Natural, Artificial, Unknown, Message, Image)
      2. Detailed Reasoning
      3. Recommendation for further analysis (e.g., "Try decoding as image with width 100", "Check for pulsar timing", etc.)
      
      Return as JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            recommendation: { type: Type.STRING },
          },
          required: ["classification", "reasoning", "recommendation"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return null;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return null;
  }
}

export async function generateVisualSignature(
  signalName: string,
  base64Image: string
): Promise<{ title: string; signatureSvg: string; description: string } | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const imagePart = {
      inlineData: {
        mimeType: "image/png",
        data: base64Image.split(',')[1],
      },
    };

    const prompt = `You are Nexus, analyzing a decoded extraterrestrial or astronomical image.
Generate an abstract, stylized "visual signature" in pure SVG format (using elements like <path>, <circle>, <rect>, etc. with appropriate viewBox, preferably 400x400) that artisticly interprets the structure, anomalies, or significance of this image. Ensure the SVG code is clean, visually striking, and uses a dark/hacker aesthetic color palette (e.g., emeralds, indigos, dark slates).
Also provide a short cryptic title and a brief description of what this signature represents.

Return as JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview", // Use a capable model for SVG generation
      contents: {
        parts: [imagePart, { text: prompt }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            signatureSvg: { type: Type.STRING, description: "The raw SVG string, starting with <svg> and ending with </svg>." },
            description: { type: Type.STRING },
          },
          required: ["title", "signatureSvg", "description"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return null;
  } catch (error) {
    console.error("AI Signature Generation Error:", error);
    return null;
  }
}

export async function detectImageInSignal(
  base64Images: string[]
): Promise<{ bestIndex: number; reasoning: string } | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const parts = base64Images.map((data, i) => ({
      inlineData: {
        mimeType: "image/png",
        data: data.split(',')[1],
      },
    }));

    const prompt = "I am providing several candidate decodings of a radio signal. Which one looks most like a structured image or a meaningful pattern? Return the index (0-based) and a brief reasoning.";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: {
        parts: [...parts, { text: prompt }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bestIndex: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
          },
          required: ["bestIndex", "reasoning"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return null;
  } catch (error) {
    console.error("AI Detection Error:", error);
    return null;
  }
}
