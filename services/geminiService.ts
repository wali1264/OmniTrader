
import { GoogleGenAI, Modality } from "@google/genai";
import { DoctorDiagnosis, DualDiagnosis, LabAnalysis, PatientData, RadiologyAnalysis, PhysicalExamAnalysis, PatientRecord, CardiologyAnalysis, NeurologyAnalysis, PsychologyAnalysis, OphthalmologyAnalysis, PediatricsAnalysis, OrthopedicsAnalysis, DentistryAnalysis, GynecologyAnalysis, PulmonologyAnalysis, GastroenterologyAnalysis, UrologyAnalysis, HematologyAnalysis, EmergencyAnalysis, GeneticsAnalysis, PrescriptionItem, PatientVitals } from "../types";

// --- API Key Statistics Interface ---
export interface KeyStats {
  key: string;
  maskedKey: string;
  usageCount: number;
  errorCount: number;
  lastUsed: number;
  status: 'active' | 'cooldown';
}

// --- API Key Rotation Manager ---
class KeyManager {
  private keys: string[] = [];
  private stats: Map<string, KeyStats> = new Map();
  private index = 0;

  constructor() {
    this.discoverKeys();
  }

  private discoverKeys() {
    const foundKeys: string[] = [];

    try {
      if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        foundKeys.push(process.env.API_KEY);
      }
    } catch (e) { }

    try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        const meta = import.meta.env;
        for (const k in meta) {
          if (k.startsWith('VITE_GOOGLE_GENAI_TOKEN')) {
            const val = meta[k];
            if (typeof val === 'string' && val.length > 5) {
              foundKeys.push(val);
            }
          }
        }
      }
    } catch (e) { }
    
    try {
        if (typeof process !== 'undefined' && process.env) {
            Object.keys(process.env).forEach(k => {
                if (k.startsWith('VITE_GOOGLE_GENAI_TOKEN')) {
                    const val = process.env[k];
                    if (val && typeof val === 'string') foundKeys.push(val);
                }
            });
        }
    } catch (e) { }

    this.keys = Array.from(new Set(foundKeys));
    this.keys.forEach(k => {
      if (!this.stats.has(k)) {
        this.stats.set(k, {
          key: k,
          maskedKey: `${k.substring(0, 4)}...${k.substring(k.length - 4)}`,
          usageCount: 0,
          errorCount: 0,
          lastUsed: 0,
          status: 'active'
        });
      }
    });
    
    console.log(`[AI System] Multi-Key System Active. Loaded ${this.keys.length} API Keys.`);
  }

  get currentKey() {
    if (this.keys.length === 0) return undefined;
    return this.keys[this.index];
  }

  public getClient() {
    const key = this.currentKey;
    if (!key) throw new Error("No API Keys configured. Please check environment variables.");
    
    const stat = this.stats.get(key);
    if (stat) {
      stat.usageCount++;
      stat.lastUsed = Date.now();
      stat.status = 'active'; 
    }

    return new GoogleGenAI({ apiKey: key });
  }

  public rotate() {
    const currentKey = this.currentKey;
    if (currentKey) {
       const stat = this.stats.get(currentKey);
       if (stat) {
         stat.errorCount++;
         stat.status = 'cooldown';
       }
    }

    if (this.keys.length > 1) {
      this.index = (this.index + 1) % this.keys.length;
      console.warn(`[AI System] ⚠️ Quota hit or error. Rotating to Key Index: ${this.index + 1}/${this.keys.length}`);
    }
  }
  
  public hasKeys() {
    return this.keys.length > 0;
  }

  public getStatistics(): KeyStats[] {
    return Array.from(this.stats.values());
  }
}

export const keyManager = new KeyManager();

async function withRetry<T>(fn: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  let attempts = 0;
  const maxAttempts = Math.min(Math.max(2, keyManager['keys'].length), 5); 

  while (attempts < maxAttempts) {
    try {
      const ai = keyManager.getClient();
      return await fn(ai);
    } catch (error: any) {
      attempts++;
      console.warn(`[AI Error] Attempt ${attempts} failed:`, error);
      
      const isRetryable = error.message?.includes('429') || 
                          error.message?.includes('503') || 
                          error.status === 429 || 
                          error.status === 503 ||
                          error.message?.includes('Quota') ||
                          error.message?.includes('Resource has been exhausted');

      if (isRetryable && attempts < maxAttempts) {
        keyManager.rotate();
        await new Promise(r => setTimeout(r, 500 * attempts));
        continue;
      }
      
      throw error;
    }
  }
  throw new Error("Maximum retry attempts reached. Service unavailable.");
}

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

// --- CORE ANALYSIS FUNCTIONS ---

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
      
      OUTPUT JSON FORMAT ONLY:
      {
        "modern": {
          "diagnosis": "string",
          "reasoning": "string",
          "treatmentPlan": ["string"],
          "lifestyle": ["string"],
          "warnings": ["string"]
        },
        "traditional": {
          "diagnosis": "string (Mizaj/Akhlat)",
          "reasoning": "string",
          "treatmentPlan": ["string (Herbal/Natural)"],
          "lifestyle": ["string (Sitta-e-Zaruria)"],
          "warnings": ["string"]
        }
      }
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
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: "application/json"
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
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return response.text || "خطا در جمع‌بندی";
  });
};

export const generateAudioSummary = async (text: string): Promise<string> => {
  return withRetry(async (ai) => {
    const prompt = `Read this medical summary in a professional, reassuring Persian (Farsi) voice: ${text.substring(0, 1000)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
      
      OUTPUT JSON:
      {
        "sampleType": "string",
        "visualFindings": "string",
        "suspectedOrganism": "string",
        "recommendations": ["string"],
        "severity": "low" | "medium" | "high"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts: [imgPart, { text: prompt }] }],
      config: {
        responseMimeType: "application/json"
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
      
      OUTPUT JSON:
      {
        "modality": "string",
        "region": "string",
        "findings": ["string"],
        "impression": "string",
        "severity": "normal" | "abnormal" | "critical",
        "anatomicalLocation": "string"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts: [imgPart, { text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}") as RadiologyAnalysis;
  });
};

export const analyzePhysicalExam = async (image: File, examType: 'skin' | 'tongue' | 'face'): Promise<PhysicalExamAnalysis> => {
  return withRetry(async (ai) => {
    const imgPart = await fileToGenerativePart(image);
    const prompt = `
      Analyze this physical exam image. Type: ${examType}. 
      Return findings, diagnosis, severity, traditional analysis.
      
      OUTPUT JSON:
      {
        "examType": "string",
        "findings": ["string"],
        "diagnosis": "string",
        "severity": "low" | "medium" | "high",
        "traditionalAnalysis": "string",
        "recommendations": ["string"]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts: [imgPart, { text: prompt }] }],
      config: {
        responseMimeType: "application/json"
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
      Analyze this prescription image to extract data.

      RULES:
      1. Drug Name includes Strength (e.g. "Amoxicillin 500mg").
      2. Dosage = Quantity/Count (e.g. "N=20" -> "20").
      3. Translate instructions to Persian (BID -> هر ۱۲ ساعت).
      
      OUTPUT JSON:
      {
        "items": [
          { "drug": "string", "dosage": "string", "instruction": "string" }
        ],
        "diagnosis": "string",
        "vitals": {
          "bloodPressure": "string",
          "heartRate": "string",
          "temperature": "string",
          "spO2": "string",
          "weight": "string",
          "height": "string",
          "respiratoryRate": "string",
          "bloodSugar": "string"
        }
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts: [imgPart, { text: prompt }] }],
      config: {
        responseMimeType: "application/json"
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
      contents: [{ role: 'user', parts: [
          { inlineData: { mimeType: "audio/mp3", data: base64Audio } },
          { text: "Listen to this medical dictation (Persian/Farsi). Transcribe it exactly." }
        ]
      }]
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
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
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
