import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface VisualSignatureParams {
  metadata: {
    name: string;
    category: string;
    description: string;
  };
  stats: {
    peakAmplitude: number;
    rms: number;
    snr: number;
    dominantFrequency: number;
  };
  patterns: {
    type: 'artificial' | 'natural' | 'noise';
    confidence: number;
    period: number | null;
  };
}

export async function generateSignalVisualSignature(params: VisualSignatureParams): Promise<string | null> {
  const { metadata, stats, patterns } = params;
  
  const prompt = `
    Generate an abstract, cosmic, and artistic visual representation of a radio signal with the following characteristics:
    - Name: ${metadata.name}
    - Category: ${metadata.category}
    - Description: ${metadata.description}
    - Peak Amplitude: ${stats.peakAmplitude.toFixed(3)}
    - SNR: ${stats.snr.toFixed(1)} dB
    - Dominant Frequency: ${stats.dominantFrequency} Hz
    - Pattern Type: ${patterns.type}
    - Confidence: ${(patterns.confidence * 100).toFixed(0)}%
    ${patterns.period ? `- Periodicity: ${patterns.period} samples` : ''}
    
    The image should be a "Visual Signature" or "Astro-Art" that captures the essence of this signal. 
    - If it's artificial: Use geometric, structured, rhythmic, and vibrant neon colors.
    - If it's natural: Use organic, fluid, nebulous, and ethereal celestial forms.
    - If it's noise: Use chaotic, grainy, static-like, and dark monochromatic textures.
    
    Style: Modern, minimalist, high-contrast, cinematic space art. No text in the image.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating visual signature:", error);
    return null;
  }
}
