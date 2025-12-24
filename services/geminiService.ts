
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { PlantCareInfo } from "../types";

const API_KEY = process.env.API_KEY || '';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  async identifyPlant(imageBase64: string): Promise<PlantCareInfo> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            text: "Identify the plant in this image and provide detailed care instructions. Be specific and helpful.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plantName: { type: Type.STRING },
            scientificName: { type: Type.STRING },
            description: { type: Type.STRING },
            watering: { type: Type.STRING },
            sunlight: { type: Type.STRING },
            soil: { type: Type.STRING },
            difficulty: { 
              type: Type.STRING,
              description: "Choose from: Easy, Moderate, Challenging"
            },
            pests: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["plantName", "scientificName", "description", "watering", "sunlight", "soil", "difficulty", "pests", "tips"]
        },
      },
    });

    const text = response.text || '{}';
    try {
      return JSON.parse(text) as PlantCareInfo;
    } catch (e) {
      console.error("Failed to parse plant data:", e);
      throw new Error("Could not parse plant identification data.");
    }
  }

  createChat(): Chat {
    return this.ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: "You are GardenPro, an expert botanist and gardening assistant. You help users with plant care, pest identification, landscaping advice, and indoor plant maintenance. Provide scientifically accurate but accessible advice. If you don't know something, suggest consulting a local nursery.",
      },
    });
  }
}

export const geminiService = new GeminiService();
