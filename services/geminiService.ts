
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DoctorDiagnosis, DualDiagnosis, LabAnalysis, PatientData, RadiologyAnalysis, PhysicalExamAnalysis, PatientRecord, CardiologyAnalysis, NeurologyAnalysis, PsychologyAnalysis, OphthalmologyAnalysis, PediatricsAnalysis, OrthopedicsAnalysis, DentistryAnalysis, GynecologyAnalysis, PulmonologyAnalysis, GastroenterologyAnalysis, UrologyAnalysis, HematologyAnalysis, EmergencyAnalysis, GeneticsAnalysis, PrescriptionItem, PatientVitals } from "../types";

// --- API Key Rotation Manager ---
class KeyManager {
  private keys: string[] = [];
  private index = 0;

  constructor() {
    this.discoverKeys();
  }

  private discoverKeys() {
    const foundKeys: string[] = [];

    // 1. Check standard process.env.API_KEY
    if (process.env.API_KEY) foundKeys.push(process.env.API_KEY);

    // 2. Scan for VITE_GOOGLE_GENAI_TOKEN_* in both process.env and import.meta.env
    // We safely access import.meta.env if available (Vite)
    const envVars = { 
      ...process.env, 
      // @ts-ignore
      ...(typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}) 
    };
    
    Object.keys(envVars).forEach(k => {
      if (k.startsWith('VITE_GOOGLE_GENAI_TOKEN')) {
        const val = envVars[k];
        if (typeof val === 'string' && val.length > 5) { // Basic length check
          foundKeys.push(val);
        }
      }
    });
    
    // Dedup
    this.keys = Array.from(new Set(foundKeys));
    console.log(`[AI System] Multi-Key System Active. Loaded ${this.keys.length} API Keys.`);
  }

  get currentKey() {
    if (this.keys.length === 0) return undefined;
    return this.keys[this.index];
  }

  public getClient() {
    const key = this.currentKey;
    if (!key) throw new Error("No API Keys configured. Please check environment variables.");
    return new GoogleGenAI({ apiKey: key });
  }

  public rotate() {
    if (this.keys.length > 1) {
      this.index = (this.index + 1) % this.keys.length;
      console.warn(`[AI System] ⚠️ Quota hit or error. Rotating to Key Index: ${this.index + 1}/${this.keys.length}`);
    }
  }
  
  public hasKeys() {
    return this.keys.length > 0;
  }
}

export const keyManager = new KeyManager();

// --- Retry Wrapper for Robustness ---
async function withRetry<T>(fn: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  let attempts = 0;
  // Try enough times to potentially cycle through keys if needed, cap at 5
  const maxAttempts = Math.min(Math.max(2, keyManager['keys'].length), 5); 

  while (attempts < maxAttempts) {
    try {
      const ai = keyManager.getClient();
      return await fn(ai);
    } catch (error: any) {
      attempts++;
      
      // Check for Retryable Errors (429 Quota, 503 Service Unavailable)
      const isRetryable = error.message?.includes('429') || 
                          error.message?.includes('503') || 
                          error.status === 429 || 
                          error.status === 503 ||
                          error.message?.includes('Quota') ||
                          error.message?.includes('Resource has been exhausted');

      if (isRetryable && attempts < maxAttempts) {
        console.warn(`[AI System] Request failed (Attempt ${attempts}). Initiating Failover...`);
        keyManager.rotate();
        // Exponential backoff or small delay
        await new Promise(r => setTimeout(r, 500 * attempts));
        continue;
      }
      
      throw error;
    }
  }
  throw new Error("Maximum retry attempts reached. Service unavailable.");
}

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to convert Blob to Base64 (for Audio)
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const modernSchema = {
  type: Type.OBJECT,
  properties: {
    diagnosis: { type: Type.STRING },
    reasoning: { type: Type.STRING },
    treatmentPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
    lifestyle: { type: Type.ARRAY, items: { type: Type.STRING } },
    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
  }
};

const traditionalSchema = {
  type: Type.OBJECT,
  properties: {
    diagnosis: { type: Type.STRING, description: "Diagnosis based on Iranian Traditional Medicine (Mizaj, Akhlat)" },
    reasoning: { type: Type.STRING },
    treatmentPlan: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Herbal remedies and natural treatments" },
    lifestyle: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sitta-e-Zaruria recommendations" },
    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
  }
};

export const analyzePatient = async (data: PatientData): Promise<DualDiagnosis> => {
  return withRetry(async (ai) => {
    const parts: any[] = [];
    const promptText = `
      Patient Information:
      Name: ${data.name}, Age: ${data.age}, Gender: ${data.gender}
      Complaint: ${data.chiefComplaint}
      History: ${data.history}
      
      Vitals:
      - BP: ${data.vitals.bloodPressure}
      - HR: ${data.vitals.heartRate}
      - Temp: ${data.vitals.temperature}
      - RR: ${data.vitals.respiratoryRate}
      - SpO2: ${data.vitals.spO2}
      - Glucose: ${data.vitals.bloodSugar}
      - Weight: ${data.vitals.weight}kg
      
      Task: You are two expert doctors analyzing this patient simultaneously.
      1. A Modern Medical Specialist (Internal Medicine).
      2. A Master of Iranian Traditional Medicine (Hakim).
      
      Provide a JSON response containing both analyses. 
    `;

    parts.push({ text: promptText });

    if (data.image) {
      const imgPart = await fileToGenerativePart(data.image);
      parts.push(imgPart);
      parts.push({ text: "Also analyze the attached image of the patient for visual signs." });
    }

    if (data.labReport) {
      const labPart = await fileToGenerativePart(data.labReport);
      parts.push(labPart);
      parts.push({ text: "Review the attached lab report." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            modern: modernSchema,
            traditional: traditionalSchema
          }
        }
      }
    });

    return JSON.parse(response.text || "{}") as DualDiagnosis;
  });
};

export const generateConsensus = async (modern: DoctorDiagnosis, traditional: DoctorDiagnosis): Promise<string> => {
  return withRetry(async (ai) => {
    const prompt = `
      Act as a Medical Board Director. Review these two opinions:
      Modern: ${JSON.stringify(modern)}
      Traditional: ${JSON.stringify(traditional)}

      1. Identify conflicts (e.g., drug-herb interactions).
      2. Create a unified, safe plan.
      3. Simulate a brief dialogue between the two doctors where they agree on the final path.
      
      Output structured markdown in Persian.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "خطا در جمع‌بندی";
  });
};

export const generateAudioSummary = async (text: string): Promise<string> => {
  return withRetry(async (ai) => {
    const prompt = `Read this medical summary in a professional, reassuring Persian (Farsi) voice: ${text.substring(0, 1000)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || "";
  });
};

// Chat is stateful, so we just return the client. The UI should handle re-creation if it fails severely, 
// but for simple text chats, the quota error usually happens on connection or message.
export const createMedicalChat = (patientData: PatientData, diagnosis: DualDiagnosis, consensus: string) => {
  const ai = keyManager.getClient();
  const systemContext = `
    You are the "Smart Physician Medical Council". 
    You have analyzed patient: ${patientData.name}.
    
    Current Diagnosis Context:
    Modern View: ${diagnosis.modern.diagnosis}
    Traditional View: ${diagnosis.traditional.diagnosis}
    Consensus: ${consensus}

    Your goal is to answer the doctor's follow-up questions in Persian.
    Maintain a professional, collaborative tone.
  `;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemContext
    }
  });
};

export const analyzeCulture = async (image: File, type: string, notes: string): Promise<LabAnalysis> => {
  return withRetry(async (ai) => {
    const imgPart = await fileToGenerativePart(image);
    const prompt = `
      You are an expert Microbiologist. Analyze this image of a ${type} culture.
      Notes: ${notes}
      Identify colony morphology, hemolysis, lactose fermentation, and likely organism.
      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imgPart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sampleType: { type: Type.STRING },
            visualFindings: { type: Type.STRING },
            suspectedOrganism: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            severity: { type: Type.STRING, enum: ["low", "medium", "high"] }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}") as LabAnalysis;
  });
};

export const analyzeRadiology = async (image: File, modality: string, region: string): Promise<RadiologyAnalysis> => {
  return withRetry(async (ai) => {
    const imgPart = await fileToGenerativePart(image);
    const prompt = `
      You are an expert Radiologist. Analyze this ${modality} of ${region}.
      Provide findings, impression, severity, and anatomical location.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imgPart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            modality: { type: Type.STRING },
            region: { type: Type.STRING },
            findings: { type: Type.ARRAY, items: { type: Type.STRING } },
            impression: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["normal", "abnormal", "critical"] },
            anatomicalLocation: { type: Type.STRING },
          }
        }
      }
    });

    return JSON.parse(response.text || "{}") as RadiologyAnalysis;
  });
};

export const analyzePhysicalExam = async (image: File, examType: 'skin' | 'tongue' | 'face'): Promise<PhysicalExamAnalysis> => {
  return withRetry(async (ai) => {
    const imgPart = await fileToGenerativePart(image);
    const prompt = `Analyze this physical exam image. Type: ${examType}. Return findings, diagnosis, severity, traditional analysis.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imgPart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            examType: { type: Type.STRING },
            findings: { type: Type.ARRAY, items: { type: Type.STRING } },
            diagnosis: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
            traditionalAnalysis: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}") as PhysicalExamAnalysis;
  });
};

export const digitizePrescription = async (image: File): Promise<{ items: PrescriptionItem[], diagnosis?: string, vitals?: PatientVitals }> => {
  return withRetry(async (ai) => {
    const imgPart = await fileToGenerativePart(image);
    const prompt = `
      You are an expert Senior Pharmacist (Dr. Darusaz).
      Analyze this prescription.
      Extract items (drug, dosage as clean number like '5', '10', instructions in Persian).
      Extract Diagnosis and Vitals if present.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imgPart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
         responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drug: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  instruction: { type: Type.STRING }
                }
              }
            },
            diagnosis: { type: Type.STRING },
            vitals: {
              type: Type.OBJECT,
              properties: {
                bloodPressure: { type: Type.STRING },
                heartRate: { type: Type.STRING },
                temperature: { type: Type.STRING },
                spO2: { type: Type.STRING },
                weight: { type: Type.STRING },
                height: { type: Type.STRING },
                respiratoryRate: { type: Type.STRING },
                bloodSugar: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  });
};

export const transcribeMedicalAudio = async (audio: Blob): Promise<string> => {
  return withRetry(async (ai) => {
    const base64Audio = await blobToBase64(audio);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "audio/mp3", data: base64Audio } },
          { text: "Listen to this medical dictation (Persian/Farsi). Transcribe it exactly." }
        ]
      }
    });
    return response.text || "";
  });
};

export const generateTimelineAnalysis = async (current: any, history: any[]): Promise<string> => {
    return withRetry(async (ai) => {
        const prompt = `
          Analyze the patient's history to identify trends.
          Current Visit: ${JSON.stringify(current)}
          Past History: ${JSON.stringify(history)}
          Output a brief Persian report.
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text || "عدم توانایی در تحلیل روند.";
    });
};

// Generic placeholder wrapper
const wrapPlaceholder = async (fn: Function) => withRetry(async (ai) => { return {}; });

export const analyzeECG = async (image: File, context: string) => wrapPlaceholder(() => {});
export const analyzeHeartSound = async (audio: Blob) => wrapPlaceholder(() => {});
export const calculateCardiacRisk = async (profile: string) => wrapPlaceholder(() => {});
export const analyzeNeurologyVideo = async (video: File, type: string) => wrapPlaceholder(() => {});
export const analyzeCognitiveSpeech = async (audio: Blob) => wrapPlaceholder(() => {});
export const analyzePsychologyImage = async (image: File) => wrapPlaceholder(() => {});
export const analyzeDream = async (text: string) => wrapPlaceholder(() => {});
export const analyzeSentiment = async (audio: Blob) => wrapPlaceholder(() => {});
export const analyzeOphthalmology = async (image: File, type: string) => wrapPlaceholder(() => {});
export const analyzeBabyCry = async (audio: Blob) => wrapPlaceholder(() => {});
export const analyzeChildDevelopment = async (video: File) => wrapPlaceholder(() => {});
export const calculateGrowthProjection = async (data: any) => wrapPlaceholder(() => {});
export const analyzeOrthopedics = async (image: File, type: string) => wrapPlaceholder(() => {});
export const analyzeDentistry = async (image: File, type: string) => wrapPlaceholder(() => {});
export const analyzeGynecology = async (input: any, type: string) => wrapPlaceholder(() => {});
export const analyzePulmonology = async (input: any, type: string) => wrapPlaceholder(() => {});
export const analyzeGastroenterology = async (input: any, type: string) => wrapPlaceholder(() => {});
export const analyzeUrology = async (input: any, type: string) => wrapPlaceholder(() => {});
export const analyzeHematology = async (input: any, type: string) => wrapPlaceholder(() => {});
export const analyzeEmergency = async (input: any, type: string) => wrapPlaceholder(() => {});
export const analyzeGenetics = async (input: any, type: string) => wrapPlaceholder(() => {});
