
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

export const getCarServiceAdvice = async (carDescription: string, symptoms: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User has a ${carDescription} with symptoms: ${symptoms}. 
      As a professional senior automotive technician, provide a brief, professional advice summary and suggest 3-4 likely service items with estimated prices. 
      Be helpful but concise.`,
      config: {
        systemInstruction: "You are a world-class automotive service advisor with 20 years of experience. You specialize in accurate diagnostics and fair pricing.",
      },
    });

    return response.text || "I'm sorry, I couldn't process that request right now. Please check your connection.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The automotive advisor is currently unavailable. Please try again later.";
  }
};
