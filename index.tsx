
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";

// --- Configuration & Constants ---
const MODEL_NAME = "gemini-2.5-flash"; 

// --- Key Management System (Load Balancer & Stats) ---
interface KeyStat {
    id: number;
    load: number;     // "Cycles"
    errors: number;
    status: "active" | "offline";
}

let apiKeys: string[] = [];
let keyStats: KeyStat[] = []; 
let currentKeyIndex = 0;

const initializeApiKeys = () => {
    const keys: string[] = [];
    const stats: KeyStat[] = [];
    let count = 0;

    const addKey = (k: any) => {
        if (typeof k === 'string' && k.length > 10 && !keys.includes(k)) {
            keys.push(k);
            stats.push({ id: count, load: 0, errors: 0, status: "active" });
            count++;
        }
    };

    // 1. Try standard single keys first (Unit 0 - Base Key)
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            addKey(import.meta.env.VITE_GOOGLE_GENAI_TOKEN);
        }
    } catch (e) {}

    try {
        if (typeof process !== 'undefined' && process.env) {
             addKey(process.env['VITE_GOOGLE_GENAI_TOKEN']);
             // Legacy fallback if not added
             if (keys.length === 0) addKey(process.env.API_KEY);
        }
    } catch (e) {}

    // 2. Scan for Multi-Keys (Unit 1 to 20)
    // Pattern: VITE_GOOGLE_GENAI_TOKEN_1, VITE_GOOGLE_GENAI_TOKEN_2, ...
    for (let i = 1; i <= 20; i++) {
        const keyNames = [
            `VITE_GOOGLE_GENAI_TOKEN_${i}`, 
            `VITE_API_KEY_${i}`             
        ];
        
        for (const keyName of keyNames) {
            try {
                // @ts-ignore
                if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[keyName]) {
                    // @ts-ignore
                    addKey(import.meta.env[keyName]);
                } else if (typeof process !== 'undefined' && process.env && process.env[keyName]) {
                    addKey(process.env[keyName]);
                }
            } catch (e) {}
        }
    }

    keyStats = stats;
    return keys;
};

// Initialize once
apiKeys = initializeApiKeys();

const getNextKeyInfo = () => {
    if (apiKeys.length === 0) return null;
    
    // Round-Robin selection
    const key = apiKeys[currentKeyIndex];
    const index = currentKeyIndex;
    
    // Rotate index for next time
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    
    return { key, index };
};

const updateKeyStat = (index: number, isError: boolean, isQuota: boolean = false) => {
    if (keyStats[index]) {
        if (isError) {
            keyStats[index].errors++;
            if (isQuota) keyStats[index].status = 'offline';
        } else {
            keyStats[index].load++;
            if (keyStats[index].status === 'offline') keyStats[index].status = 'active'; // Recover if success
        }
    }
};

// --- Types ---
interface LogEntry {
  timestamp: string;
  type: "info" | "success" | "error" | "analysis" | "alert";
  message: string;
}

interface GroundingSource {
  title?: string;
  uri?: string;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp: string;
}

interface SignalData {
    symbol: string;
    action: string;
    entry: string;
    sl: string;
    tp: string;
    confidence: string;
    score: number; // 0-100
}

type RiskProfile = "conservative" | "moderate" | "aggressive";
type TradingStyle = "scalping" | "day" | "swing";
type NewsStrategy = "focused" | "hybrid";

// --- Main Application Component ---
const App = () => {
  // --- State Management ---
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisSources, setAnalysisSources] = useState<GroundingSource[]>([]);
  const [marketCondition, setMarketCondition] = useState<string>("در انتظار..."); 
  const [signalData, setSignalData] = useState<SignalData | null>(null); 
  
  // Phase 2 & 3 States
  const [autoMode, setAutoMode] = useState(false);
  const [scanInterval, setScanInterval] = useState(15000); 
  const [lastAnalysisText, setLastAnalysisText] = useState<string>("");
  const [enableNews, setEnableNews] = useState(true);

  // Phase 4 States: Strategy & Risk
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("moderate");
  const [tradingStyle, setTradingStyle] = useState<TradingStyle>("day");

  // Phase 9: Money Management States
  const [accountBalance, setAccountBalance] = useState<number>(1000);
  const [riskPercentage, setRiskPercentage] = useState<number>(1);

  // Phase 5 States: Voice & Polish
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastSpokenText, setLastSpokenText] = useState("");

  // Phase 6: Source Management Module
  const [newsStrategy, setNewsStrategy] = useState<NewsStrategy>("hybrid");
  const [trustedSources, setTrustedSources] = useState<string[]>([
      "https://www.bloomberg.com",
      "https://www.reuters.com",
      "https://www.forexfactory.com",
      "https://www.coindesk.com"
  ]);
  const [newSourceInput, setNewSourceInput] = useState("");
  const [isSourceManagerOpen, setIsSourceManagerOpen] = useState(false);

  // Phase 10: Stealth Node Panel
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(false);
  const [nodeStats, setNodeStats] = useState<KeyStat[]>([]);

  // Chat Feature State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
      { role: 'model', text: 'سلام. من دستیار ارشد معاملاتی شما هستم. می‌توانید دستور دهید تا وضعیت بازار، اخبار فوری یا تحلیل‌های خاص را همین الان بررسی کنم.', timestamp: new Date().toLocaleTimeString('fa-IR') }
  ]);
  const [isChatThinking, setIsChatThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Helpers ---
  const addLog = (type: LogEntry["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString('fa-IR');
    setLogs((prev) => [{ timestamp, type, message }, ...prev.slice(50)]); 
  };

  const speak = useCallback((text: string) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'fa-IR'; 
      
      window.speechSynthesis.speak(utterance);
  }, []);

  const copyToClipboard = () => {
      if (analysisResult) {
          navigator.clipboard.writeText(analysisResult);
          addLog("info", "تحلیل در کلیپ‌بورد کپی شد.");
      }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAddSource = () => {
      if (newSourceInput && trustedSources.length < 10) {
          if (!newSourceInput.startsWith('http')) {
              setTrustedSources([...trustedSources, `https://${newSourceInput}`]);
          } else {
              setTrustedSources([...trustedSources, newSourceInput]);
          }
          setNewSourceInput("");
      }
  };

  const handleRemoveSource = (index: number) => {
      const newSources = [...trustedSources];
      newSources.splice(index, 1);
      setTrustedSources(newSources);
  };

  // --- Update Node Stats ---
  const refreshNodeStats = () => {
      setNodeStats([...keyStats]); // Create a copy to trigger re-render
  };

  useEffect(() => {
      if (isNodePanelOpen) {
          refreshNodeStats();
          const interval = setInterval(refreshNodeStats, 2000); // Live update when panel is open
          return () => clearInterval(interval);
      }
  }, [isNodePanelOpen]);

  // --- Lot Calculation Logic ---
  const calculateLotSize = (entryStr: string, slStr: string, symbol: string): string => {
      try {
          const entry = parseFloat(entryStr.replace(/,/g, ''));
          const sl = parseFloat(slStr.replace(/,/g, ''));
          
          if (isNaN(entry) || isNaN(sl) || entry === sl) return "نامشخص";

          const riskAmount = accountBalance * (riskPercentage / 100);
          const distance = Math.abs(entry - sl);
          
          if (distance === 0) return "نامشخص";

          let lotSize = 0;

          // Simple Heuristic for Asset Class based on Symbol or Price
          const isGold = symbol.toUpperCase().includes("GOLD") || symbol.toUpperCase().includes("XAU") || (entry > 1500 && entry < 3000);
          const isForex = symbol.toUpperCase().includes("USD") || (entry < 200 && entry > 0.5);
          const isCrypto = symbol.toUpperCase().includes("BTC") || symbol.toUpperCase().includes("ETH") || entry > 10000;

          if (isGold) {
              // Gold: 1 Lot = 100oz. 1 pip (0.1) movement = $10. 
              // Distance of $1.0 = $100 per 1 Lot.
              // Formula: Risk / (Distance * 100)
              lotSize = riskAmount / (distance * 100);
          } else if (isForex) {
              // Forex Standard: 1 Lot = 100,000 units.
              // Approx: Distance (in price) * 100,000 = Value per lot
              lotSize = riskAmount / (distance * 100000);
          } else if (isCrypto) {
               // Crypto: Direct units. 
               // Risk / Distance = Amount of coins
               lotSize = riskAmount / distance;
               return `${lotSize.toFixed(4)} واحد`; // Return as units for crypto
          } else {
              // Fallback (Generic units)
              lotSize = riskAmount / distance;
              return `${lotSize.toFixed(2)} واحد`;
          }

          // Format Forex/Gold lots
          if (lotSize < 0.01) lotSize = 0.01;
          return `${lotSize.toFixed(2)} لات`;

      } catch (e) {
          return "خطا در محاسبه";
      }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
      if (apiKeys.length > 0) {
          console.log(`System initialized with ${apiKeys.length} API Keys.`);
          addLog("info", `سیستم با ${apiKeys.length} واحد پردازشی فعال شد.`);
      } else {
          addLog("error", "هیچ واحد پردازشی (API Key) یافت نشد! تنظیمات را بررسی کنید.");
      }
  }, []);

  // --- Core Logic: Capture & Analyze ---
  const analyzeScreen = useCallback(async (isAuto = false) => {
    if (!streamRef.current || !videoRef.current || !canvasRef.current) {
      if (!isAuto) addLog("error", "تصویر زنده‌ای برای تحلیل وجود ندارد.");
      return;
    }

    if (isAnalyzing) return;

    const keyInfo = getNextKeyInfo();
    if (!keyInfo) {
        addLog("error", "واحد پردازشی (API Key) یافت نشد.");
        return;
    }

    setIsAnalyzing(true);
    if (!isAuto) addLog("info", `در حال اسکن بازار (Unit ${keyInfo.index})...`);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("خطا در دسترسی به بوم نقاشی (Canvas)");

      // Capture Frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL("image/jpeg", 0.7).split(",")[1]; 

      // Initialize AI with Rotated Key
      const ai = new GoogleGenAI({ apiKey: keyInfo.key });

      const contextPrompt = lastAnalysisText 
        ? `خلاصه تحلیل قبلی: "${lastAnalysisText.substring(0, 300)}..."` 
        : "بدون سابقه قبلی.";

      const regimeInstruction = `
        بسیار مهم: تشخیص "جنس بازار" (Market Regime):
        قبل از هر سیگنالی، ابتدا تشخیص بده بازار در چه وضعیتی است:
        1. **روند شفاف (Clear Trend)**: کندل‌های پرقدرت، جهت مشخص، بدون سایه‌های (Wicks) خیلی بلند. -> وضعیت "ایمن" است.
        2. **رنج/سردرگم (Ranging)**: قیمت در یک محدوده درجا می‌زند و جهت ندارد. -> وضعیت "احتیاط" است.
        3. **استاپ‌هانتینگ/دستکاری (Stop Hunting/Choppy)**: سایه‌های بسیار بلند، حرکات فیک (Fake-out)، رفت و برگشت‌های سریع که تریدرها را فریب می‌دهد. -> وضعیت "خطرناک" است.
        
        اگر بازار در حالت 3 (خطرناک) بود، اکیداً توصیه به صبر کن و سیگنال ورود نده.
      `;

      const strategyPrompt = `
        تنظیمات استراتژی کاربر:
        - پروفایل ریسک: ${
            riskProfile === 'conservative' ? 'محافظه‌کار (حفظ سرمایه اولویت است)' : 
            riskProfile === 'moderate' ? 'متعادل (ریسک منطقی)' : 'تهاجمی (به دنبال سود بالا)'
        }
        - سبک معاملاتی: ${
            tradingStyle === 'scalping' ? 'اسکالپ (نوسان‌گیری سریع)' : 
            tradingStyle === 'day' ? 'ترید روزانه' : 'سوینگ (میان‌مدت)'
        }
      `;

      const sourcesList = trustedSources.length > 0 ? trustedSources.join(', ') : "ندارد";
      const newsStrategyPrompt = enableNews ? `
        دستورالعمل منابع اطلاعاتی:
        لیست سفید کاربر: [${sourcesList}]
        استراتژی جستجو: ${newsStrategy === 'focused' ? 'فقط لیست سفید' : 'ترکیبی (اول لیست سفید، بعد وب)'}
      ` : "";

      const prompt = `
        تو 'آمنی‌تریدر' هستی، یک دستیار فوق‌تخصص برای معامله‌گری.
        
        ${contextPrompt}
        ${regimeInstruction}
        ${strategyPrompt}
        ${newsStrategyPrompt}
        
        وظیفه ویژه: "تک‌تیرانداز قیمت" (Sniper Mode):
        علاوه بر تحلیل، اعداد دقیق را از محور قیمت (سمت راست تصویر) استخراج کن و محاسبه کن:
        1. Entry: قیمت لحظه ای فعلی.
        2. SL (Stop Loss): برای خرید زیر حمایت نزدیک/سایه کندل، برای فروش بالای مقاومت نزدیک/سایه کندل.
        3. TP (Take Profit): حداقل 1.5 برابر ریسک (Risk/Reward > 1.5).

        وظیفه جدید: "نمره‌دهی سیگنال" (Signal Scoring):
        بر اساس 5 فاکتور زیر به سیگنال نمره بده (مجموع 100):
        1. روند (Trend): 20 امتیاز
        2. الگوی کندلی (Candle): 20 امتیاز
        3. ناحیه حمایت/مقاومت (S/R): 20 امتیاز
        4. مومنتوم/حجم (Momentum): 20 امتیاز
        5. تاییدیه اخبار (News): 20 امتیاز
        
        وظیفه عمومی:
        1. **شناسایی نماد**: (مثلا XAUUSD, EURUSD, BTC...)
        2. **تحلیل فاز بازار**: طبق دستورالعمل بالا.
        3. **تحلیل تکنیکال و فاندامنتال**: ترکیب کندل‌ها و اخبار.
        
        فرمت خروجی (دقیقاً به همین صورت):
        [نماد: نام نماد لاتین]
        [وضعیت بازار: روند شفاف / رنج / استاپ‌هانتینگ (خطرناک)]
        [سیگنال: خرید / فروش / صبر]
        [اطمینان: 0-100%]
        [نمره اعتبار: عدد 0 تا 100]
        [ورود: عدد دقیق]
        [حد ضرر: عدد دقیق]
        [حد سود: عدد دقیق]
        
        **تحلیل جامع:**
        (توضیحات روان و استدلالی.)
      `;

      const tools = enableNews ? [{ googleSearch: {} }] : [];

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Data } },
            { text: prompt },
          ],
        },
        config: {
            tools: tools
        }
      });

      const text = response.text || "تحلیلی تولید نشد.";
      
      // Success - Update Stats
      updateKeyStat(keyInfo.index, false);
      
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: GroundingSource[] = [];
      groundingChunks.forEach((chunk: any) => {
          if (chunk.web) {
              sources.push({ title: chunk.web.title, uri: chunk.web.uri });
          }
      });

      setLastAnalysisText(text);
      setAnalysisResult(text);
      setAnalysisSources(sources);
      
      const hasBuy = text.includes("سیگنال: خرید");
      const hasSell = text.includes("سیگنال: فروش");
      
      const regimeMatch = text.match(/\[وضعیت بازار:\s*(.*?)\]/);
      const currentRegime = regimeMatch ? regimeMatch[1].trim() : "نامشخص";
      setMarketCondition(currentRegime);
      
      // Parse Sniper Data
      const symbolMatch = text.match(/\[نماد:\s*(.*?)\]/);
      const entryMatch = text.match(/\[ورود:\s*(.*?)\]/);
      const slMatch = text.match(/\[حد ضرر:\s*(.*?)\]/);
      const tpMatch = text.match(/\[حد سود:\s*(.*?)\]/);
      const confidenceMatch = text.match(/\[اطمینان:\s*(.*?)\]/);
      const scoreMatch = text.match(/\[نمره اعتبار:\s*(\d+)\]/);

      if ((hasBuy || hasSell) && entryMatch && slMatch && tpMatch) {
          setSignalData({
              symbol: symbolMatch ? symbolMatch[1] : "Unknown",
              action: hasBuy ? "BUY" : "SELL",
              entry: entryMatch[1],
              sl: slMatch[1],
              tp: tpMatch[1],
              confidence: confidenceMatch ? confidenceMatch[1] : "---",
              score: scoreMatch ? parseInt(scoreMatch[1]) : 0
          });
      } else {
          setSignalData(null);
      }
      
      const isDangerous = currentRegime.includes("خطرناک") || currentRegime.includes("استاپ‌هانتینگ");

      if (hasBuy || hasSell) {
         addLog("alert", `سیگنال معاملاتی شناسایی شد: ${hasBuy ? 'خرید' : 'فروش'}`);
         
         if (voiceEnabled && text !== lastSpokenText) {
             const assetName = symbolMatch ? symbolMatch[1] : "بازار";
             const action = hasBuy ? "خرید" : "فروش";
             
             let speechText = `توجه کنید. سیگنال ${action} برای ${assetName} صادر شد.`;
             if (isDangerous) {
                 speechText = `هشدار! وضعیت بازار خطرناک است و احتمال استاپ هانتینگ وجود دارد. سیگنال ${action} پرریسک است.`;
             }
             
             speak(speechText);
             setLastSpokenText(text); 
         }

      } else if (!isAuto) {
         addLog("analysis", "تحلیل انجام شد. سیگنال قطعی وجود ندارد.");
      }

    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      // Determine if Quota error
      const isQuota = err.message && (err.message.includes("429") || err.message.includes("Quota") || err.message.includes("Resource exhausted"));
      updateKeyStat(keyInfo.index, true, isQuota);

      if (err.message && err.message.includes("API key")) {
          addLog("error", "خطای واحد پردازش: کلید معتبر نیست.");
      } else if (isQuota) {
          addLog("error", `محدودیت نرخ (Unit ${keyInfo.index} Offline). سوئیچ به واحد بعدی...`);
      } else {
          addLog("error", `خطا در تحلیل: ${err.message}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, lastAnalysisText, enableNews, riskProfile, tradingStyle, voiceEnabled, lastSpokenText, speak, newsStrategy, trustedSources, accountBalance, riskPercentage]);

  // --- Chat Logic ---
  const handleSendMessage = async () => {
      if (!chatInput.trim() || isChatThinking) return;

      const keyInfo = getNextKeyInfo();
      if (!keyInfo) {
        setChatMessages(prev => [...prev, { role: 'model', text: 'خطا: واحد پردازشی در دسترس نیست.', timestamp: new Date().toLocaleTimeString('fa-IR') }]);
        return;
      }

      const userMsg = chatInput;
      setChatInput("");
      setChatMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: new Date().toLocaleTimeString('fa-IR') }]);
      setIsChatThinking(true);

      try {
          const ai = new GoogleGenAI({ apiKey: keyInfo.key });
          
          const context = lastAnalysisText 
            ? `آخرین تحلیل: "${lastAnalysisText}". وضعیت بازار: "${marketCondition}".` 
            : "هنوز تحلیل تصویری انجام نشده است.";

          const systemInstruction = `
            شما 'آمنی‌تریدر' هستید.
            ${context}
            اگر کاربر درباره "استاپ هانتینگ" یا وضعیت بازار پرسید، با توجه به تحلیل بالا پاسخ بده.
            پاسخ‌ها کوتاه و فارسی باشد.
          `;

          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: [{ role: 'user', parts: [{ text: systemInstruction + "\n\n" + userMsg }] }],
              config: { tools: [{ googleSearch: {} }] }
          });

          const responseText = response.text || "متاسفانه نتوانستم پاسخ دهم.";
          updateKeyStat(keyInfo.index, false); // Success
          setChatMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: new Date().toLocaleTimeString('fa-IR') }]);

      } catch (err: any) {
          const isQuota = err.message && (err.message.includes("429") || err.message.includes("Quota"));
          updateKeyStat(keyInfo.index, true, isQuota);
          setChatMessages(prev => [...prev, { role: 'model', text: `خطا در پردازش (Unit ${keyInfo.index}): ${err.message}`, timestamp: new Date().toLocaleTimeString('fa-IR') }]);
      } finally {
          setIsChatThinking(false);
      }
  };


  // --- Effects ---
  useEffect(() => {
    if (autoMode && isCapturing) {
        const profileFa = riskProfile === 'conservative' ? 'محافظه‌کار' : riskProfile === 'aggressive' ? 'تهاجمی' : 'متعادل';
        addLog("info", `خلبان خودکار: پایش هر ${scanInterval/1000} ثانیه [${profileFa}]`);
      
        analyzeScreen(true);
        timerRef.current = setInterval(() => {
            analyzeScreen(true);
        }, scanInterval);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!autoMode && isCapturing) addLog("info", "خلبان خودکار متوقف شد.");
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoMode, isCapturing, scanInterval, analyzeScreen, enableNews, riskProfile, tradingStyle]);


  // --- Media Handlers ---
  const startCapture = async () => {
    try {
      addLog("info", "درخواست دسترسی به صفحه نمایش...");
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "window" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);
        addLog("success", "اتصال تصویری برقرار شد.");
      }
      stream.getVideoTracks()[0].onended = () => stopCapture();
    } catch (err: any) {
      addLog("error", `اتصال ناموفق: ${err.message}`);
    }
  };

  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCapturing(false);
    setAutoMode(false);
    addLog("info", "اتصال تصویری قطع شد.");
  };

  // --- Helper for Market Badge Color ---
  const getRegimeColor = (regime: string) => {
      if (regime.includes("خطرناک") || regime.includes("استاپ")) return "bg-rose-500/20 text-rose-400 border-rose-500/50";
      if (regime.includes("رنج")) return "bg-amber-500/20 text-amber-400 border-amber-500/50";
      if (regime.includes("روند") || regime.includes("شفاف")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
      return "bg-slate-700/50 text-slate-400 border-slate-600";
  };
  
  const getScoreColor = (score: number) => {
      if (score >= 80) return "bg-emerald-500";
      if (score >= 50) return "bg-amber-500";
      return "bg-rose-500";
  };

  // --- UI Render ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 lg:p-6 font-sans flex flex-col gap-6 relative">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-amber-400 to-orange-300 tracking-tight flex items-center gap-3">
            آمنی‌تریدر هوشمند
            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded border border-amber-500/30">نسخه نهایی</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">دستیار معاملاتی خودکار، چندوجهی و فوق‌تخصص</p>
        </div>
        
        {/* Status Indicators */}
        <div className="flex items-center gap-4 flex-row-reverse md:flex-row">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isCapturing ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${isCapturing ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className={`text-xs font-bold ${isCapturing ? 'text-green-400' : 'text-red-400'}`}>
                    {isCapturing ? 'چشم بینا: فعال' : 'قطع'}
                </span>
            </div>
            
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${autoMode ? 'border-blue-500/30 bg-blue-500/10' : 'border-slate-600/30 bg-slate-800/50'}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${autoMode ? 'bg-blue-400 animate-ping' : 'bg-slate-600'}`}></span>
                <span className={`text-xs font-bold ${autoMode ? 'text-blue-400' : 'text-slate-500'}`}>
                    {autoMode ? 'خودکار: روشن' : 'دستی'}
                </span>
            </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow h-[calc(100vh-160px)]">
        
        {/* Right Panel (Originally Left): Visual Feed & Controls */}
        <div className="lg:col-span-8 flex flex-col gap-4 h-full">
          
          {/* Video Container */}
          <div className="bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative flex-grow flex flex-col group min-h-[300px]">
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="relative flex-grow bg-slate-900 flex items-center justify-center overflow-hidden">
                <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-contain transition-opacity duration-500 ${isCapturing ? 'opacity-100' : 'opacity-20'}`}
                />
                
                {/* Visual Scanner Effect */}
                {isAnalyzing && isCapturing && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                         <div className="w-full h-1 bg-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-scan"></div>
                    </div>
                )}
                
                {!isCapturing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-24 h-24 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M15 10l4.553-2.276A1 1 0 0121 8.818v6.364a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-light tracking-wide">در انتظار اتصال تصویری...</p>
                    <p className="text-xs text-slate-600 mt-2">لطفاً پنجره متاتریدر یا تریدینگ ویو را انتخاب کنید</p>
                </div>
                )}
            </div>

            {/* Overlay Info */}
            {isCapturing && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 flex justify-between items-end z-30">
                    <div className="flex gap-4">
                        <div className="text-xs text-slate-400">
                             سرمایه: <span className="text-emerald-400 font-bold">${accountBalance}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                             ریسک: <span className="text-rose-400 font-bold">{riskPercentage}%</span>
                        </div>
                        <div className="text-xs text-slate-400">
                             جستجو: <span className="text-amber-400 font-bold">{
                                newsStrategy === 'focused' ? 'متمرکز (لیست)' : 'ترکیبی (وب)'
                             }</span>
                        </div>
                    </div>
                    {isAnalyzing && (
                        <div className="flex items-center gap-2 bg-amber-600/20 border border-amber-500/50 px-3 py-1 rounded text-amber-300 text-xs font-bold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            در حال پردازش (Unit {currentKeyIndex})
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* Control Deck */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-auto">
             
             {/* Connection Controls */}
             <div className="flex gap-2">
                {!isCapturing ? (
                    <button 
                    onClick={startCapture}
                    className="flex-grow bg-emerald-700 hover:bg-emerald-600 text-white py-3 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 group"
                    >
                    <span className="group-hover:animate-pulse">◉</span>
                    اتصال تصویری به بازار
                    </button>
                ) : (
                    <button 
                    onClick={stopCapture}
                    className="flex-grow bg-red-900/40 hover:bg-red-900/60 text-red-200 border border-red-800/50 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                    قطع ارتباط
                    </button>
                )}
             </div>

             {/* Auto-Pilot & Settings */}
             <div className="bg-slate-900 rounded-lg p-3 border border-slate-800 flex flex-col gap-2 relative group">
                 
                 {/* Top Row: Toggles */}
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2" title="جستجوی گوگل برای اخبار">
                            <input 
                                type="checkbox" 
                                id="newsToggle"
                                checked={enableNews}
                                onChange={(e) => setEnableNews(e.target.checked)}
                                className="w-4 h-4 accent-amber-500 cursor-pointer"
                            />
                            <label htmlFor="newsToggle" className="text-xs text-slate-300 cursor-pointer select-none">اخبار</label>
                        </div>

                         <button 
                            onClick={() => setIsSourceManagerOpen(true)}
                            className="text-xs text-amber-400 hover:text-amber-300 underline"
                        >
                            تنظیم منابع
                        </button>
                    </div>
                    
                     <button
                        onClick={() => setAutoMode(!autoMode)}
                        disabled={!isCapturing}
                        className={`px-3 py-1 rounded font-bold text-xs transition-all border ${
                            !isCapturing ? 'opacity-50 cursor-not-allowed border-slate-700 text-slate-500' :
                            autoMode 
                            ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500 shadow-lg shadow-blue-900/20' 
                            : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
                        }`}
                    >
                        {autoMode ? 'توقف خلبان خودکار' : 'شروع خلبان خودکار'}
                    </button>
                 </div>

                 {/* Money Management Inputs */}
                 <div className="grid grid-cols-2 gap-2 mt-1 border-t border-slate-800 pt-2">
                     <div className="flex flex-col gap-1">
                         <label className="text-[10px] text-slate-500">سرمایه ($)</label>
                         <input 
                            type="number" 
                            value={accountBalance}
                            onChange={(e) => setAccountBalance(Number(e.target.value))}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                         />
                     </div>
                     <div className="flex flex-col gap-1">
                         <label className="text-[10px] text-slate-500">ریسک (%)</label>
                         <input 
                            type="number" 
                            step="0.1"
                            value={riskPercentage}
                            onChange={(e) => setRiskPercentage(Number(e.target.value))}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-rose-500"
                         />
                     </div>
                 </div>
             </div>
          </div>
        </div>

        {/* Left Panel (Originally Right): Intelligence Hub */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full min-h-[500px]">
          
          {/* Analysis Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-0 flex flex-col flex-grow shadow-lg overflow-hidden relative group">
            <div className="bg-slate-800/50 p-3 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                        هوش مرکزی
                    </h2>
                    
                    {/* Market Regime Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${getRegimeColor(marketCondition)}`}>
                        {marketCondition}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {analysisResult && (
                        <button 
                            onClick={copyToClipboard}
                            className="text-xs text-slate-500 hover:text-white transition-colors"
                            title="کپی متن تحلیل"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    )}
                    {lastAnalysisText && <span className="text-[10px] text-green-500 border border-green-500/30 px-1.5 py-0.5 rounded">زنده</span>}
                </div>
            </div>
            
            <div className="flex-grow p-4 overflow-y-auto bg-slate-950/50 relative custom-scrollbar">
              
              {/* Sniper Card (Phase 8 + 9) */}
              {signalData && (
                  <div className={`mb-4 rounded-lg p-3 border relative overflow-hidden ${signalData.action === 'BUY' ? 'bg-emerald-900/30 border-emerald-500/50' : 'bg-rose-900/30 border-rose-500/50'} animate-fadeIn`}>
                      
                      {/* Signal Score Bar (Phase 9) */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-black/50">
                          <div 
                            className={`h-full ${getScoreColor(signalData.score)}`} 
                            style={{ width: `${signalData.score}%` }}
                          ></div>
                      </div>

                      <div className="flex justify-between items-start mb-2 mt-2">
                          <div className="flex flex-col">
                              <span className={`text-lg font-black tracking-widest ${signalData.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {signalData.action === 'BUY' ? 'خرید (BUY)' : 'فروش (SELL)'}
                              </span>
                              <span className="text-[10px] text-slate-400">{signalData.symbol}</span>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded text-white font-bold ${getScoreColor(signalData.score)}`}>
                                  امتیاز: {signalData.score}/100
                              </span>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center mb-2">
                          <div className="bg-black/40 rounded p-1">
                              <span className="block text-[9px] text-slate-500">نقطه ورود</span>
                              <span className="text-xs font-mono font-bold text-slate-200" dir="ltr">{signalData.entry}</span>
                          </div>
                          <div className="bg-black/40 rounded p-1 border border-red-500/30">
                              <span className="block text-[9px] text-red-400">حد ضرر (SL)</span>
                              <span className="text-xs font-mono font-bold text-red-200" dir="ltr">{signalData.sl}</span>
                          </div>
                          <div className="bg-black/40 rounded p-1 border border-green-500/30">
                              <span className="block text-[9px] text-green-400">حد سود (TP)</span>
                              <span className="text-xs font-mono font-bold text-green-200" dir="ltr">{signalData.tp}</span>
                          </div>
                      </div>

                      {/* Money Management Result */}
                      <div className="bg-black/50 rounded p-2 flex justify-between items-center border border-slate-700">
                          <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400">ریسک دلاری</span>
                              <span className="text-xs font-bold text-rose-300">${(accountBalance * (riskPercentage/100)).toFixed(2)}</span>
                          </div>
                          <div className="flex flex-col items-end">
                              <span className="text-[9px] text-slate-400">حجم پیشنهادی</span>
                              <span className="text-sm font-bold text-amber-400 dir-ltr">
                                  {calculateLotSize(signalData.entry, signalData.sl, signalData.symbol)}
                              </span>
                          </div>
                      </div>
                  </div>
              )}

              {analysisResult ? (
                <div className="space-y-4 animate-fadeIn">
                    <div className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap text-justify">
                        {/* Clean up the display text to remove the raw tags we parsed */}
                        {analysisResult
                            .replace(/\[نماد:.*?\]/g, '')
                            .replace(/\[ورود:.*?\]/g, '')
                            .replace(/\[حد ضرر:.*?\]/g, '')
                            .replace(/\[حد سود:.*?\]/g, '')
                            .replace(/\[اطمینان:.*?\]/g, '')
                            .replace(/\[نمره اعتبار:.*?\]/g, '')
                        }
                    </div>
                    
                    {/* Phase 3: Sources Section */}
                    {analysisSources.length > 0 && (
                        <div className="border-t border-slate-800 pt-3 mt-4">
                            <h3 className="text-[10px] font-bold text-slate-500 mb-2">منابع خبری بررسی شده</h3>
                            <ul className="space-y-1">
                                {analysisSources.map((source, idx) => (
                                    <li key={idx}>
                                        <a 
                                            href={source.uri} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="block text-xs text-blue-400 hover:text-blue-300 truncate hover:underline"
                                            style={{ direction: 'ltr', textAlign: 'right' }}
                                        >
                                            🔗 {source.title || "منبع خبری"}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 space-y-3 opacity-50">
                   <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                   </svg>
                   <p className="text-xs tracking-widest">در انتظار داده‌های بازار...</p>
                </div>
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-0 h-1/3 flex flex-col">
            <div className="bg-slate-800/50 p-2 px-4 border-b border-slate-700">
                <h2 className="text-xs font-bold text-slate-400 tracking-wider">رخدادهای سیستم</h2>
            </div>
            <div className="flex-grow overflow-y-auto p-2 space-y-1 text-xs custom-scrollbar">
              {logs.map((log, index) => (
                <div key={index} className="flex gap-2 hover:bg-white/5 p-1 rounded transition-colors">
                  <span className="text-slate-600 opacity-75 min-w-[55px] text-left" dir="ltr">{log.timestamp}</span>
                  <span className={`${
                    log.type === 'error' ? 'text-red-400 font-bold' : 
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'alert' ? 'text-amber-400 font-bold blink' :
                    log.type === 'analysis' ? 'text-blue-400' : 'text-slate-400'
                  }`}>
                    {log.type === 'error' ? 'خطا' : log.type === 'success' ? 'سیستم' : log.type === 'alert' ? 'سیگنال' : log.type === 'analysis' ? 'هوش' : 'پیام'}
                  </span>
                  <span className="text-slate-300 line-clamp-1">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

        {/* Source Manager Modal */}
        {isSourceManagerOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-0 overflow-hidden">
                    <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="font-bold text-amber-400 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                            </svg>
                            مدیریت منابع اطلاعاتی
                        </h3>
                        <button onClick={() => setIsSourceManagerOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                    </div>
                    
                    <div className="p-4 space-y-6">
                        {/* Strategy Switch */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400 block">استراتژی جستجوی اخبار:</label>
                            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg">
                                <button 
                                    onClick={() => setNewsStrategy('focused')}
                                    className={`py-2 px-3 rounded text-sm transition-all ${newsStrategy === 'focused' ? 'bg-amber-600 text-white font-bold shadow' : 'text-slate-400 hover:bg-slate-800'}`}
                                >
                                    متمرکز (فقط لیست)
                                </button>
                                <button 
                                    onClick={() => setNewsStrategy('hybrid')}
                                    className={`py-2 px-3 rounded text-sm transition-all ${newsStrategy === 'hybrid' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:bg-slate-800'}`}
                                >
                                    ترکیبی (لیست + وب)
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500">
                                {newsStrategy === 'focused' 
                                    ? 'در این حالت ربات فقط سایت‌های لیست زیر را برای اخبار بررسی می‌کند.' 
                                    : 'در این حالت اولویت با لیست زیر است، اما اخبار مهم سایر سایت‌ها هم بررسی می‌شوند.'}
                            </p>
                        </div>

                        {/* White List */}
                        <div className="space-y-3">
                            <label className="text-xs text-slate-400 block">لیست سفید (منابع معتبر شما):</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    dir="ltr"
                                    placeholder="example.com"
                                    value={newSourceInput}
                                    onChange={(e) => setNewSourceInput(e.target.value)}
                                    className="flex-grow bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none placeholder:text-slate-600"
                                />
                                <button 
                                    onClick={handleAddSource}
                                    disabled={!newSourceInput || trustedSources.length >= 10}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-3 py-2 rounded transition-colors"
                                >
                                    +
                                </button>
                            </div>
                            
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                                {trustedSources.length === 0 && <p className="text-xs text-slate-600 text-center py-2">هیچ منبعی اضافه نشده است.</p>}
                                {trustedSources.map((src, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-2 rounded group">
                                        <span className="text-xs text-slate-300 truncate max-w-[250px]" dir="ltr">{src}</span>
                                        <button 
                                            onClick={() => handleRemoveSource(idx)}
                                            className="text-slate-500 hover:text-red-400 px-1"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-500 text-left" dir="ltr">{trustedSources.length} / 10 sources</p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-800 p-3 border-t border-slate-700 flex justify-end">
                        <button onClick={() => setIsSourceManagerOpen(false)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm font-bold">تایید و ذخیره</button>
                    </div>
                </div>
            </div>
        )}

        {/* Stealth Node Status Panel (Phase 10) */}
        {isNodePanelOpen && (
            <div className="fixed inset-0 z-[60] flex items-end justify-end p-4 bg-black/40 backdrop-blur-[2px] animate-fadeIn">
                <div className="bg-slate-950 border border-slate-800 rounded-lg shadow-2xl w-full max-w-sm overflow-hidden font-mono text-xs">
                    <div className="bg-slate-900 p-3 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="text-slate-400 uppercase tracking-widest text-[10px]">Node Network Status</h3>
                        <button onClick={() => setIsNodePanelOpen(false)} className="text-slate-500 hover:text-white">✕</button>
                    </div>
                    
                    <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar space-y-3">
                         <div className="grid grid-cols-2 gap-2 mb-4">
                             <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                 <span className="block text-[9px] text-slate-500 uppercase">Active Nodes</span>
                                 <span className="text-lg text-emerald-500">{nodeStats.filter(n => n.status === 'active').length}</span>
                             </div>
                             <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                 <span className="block text-[9px] text-slate-500 uppercase">Offline Nodes</span>
                                 <span className="text-lg text-rose-500">{nodeStats.filter(n => n.status === 'offline').length}</span>
                             </div>
                         </div>
                         
                         <div className="space-y-1">
                             {nodeStats.map((node) => (
                                 <div key={node.id} className="flex justify-between items-center p-2 rounded bg-slate-900/50 border border-slate-800/50 hover:bg-slate-800 transition-colors">
                                     <div className="flex items-center gap-2">
                                         <span className={`w-1.5 h-1.5 rounded-full ${node.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                         <span className="text-slate-300">Unit {node.id}</span>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <span className="text-slate-500">Cycles: <span className="text-blue-400">{node.load}</span></span>
                                         <span className={`px-1.5 py-0.5 rounded text-[9px] ${node.status === 'active' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`}>
                                             {node.status === 'active' ? 'ACTIVE' : 'OFFLINE'}
                                         </span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>
            </div>
        )}

        {/* Floating Icons Container */}
        <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-4" dir="rtl">
            
            {/* Chat Window */}
            {isChatOpen && (
                <div className="w-80 md:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn mb-2" style={{ maxHeight: '600px', height: '500px' }}>
                    {/* ... (Chat Content from previous code) ... */}
                    <div className="bg-slate-800 p-3 border-b border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <h3 className="text-sm font-bold text-slate-200">اتاق فرمان تریدر</h3>
                        </div>
                        <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-950/80 custom-scrollbar">
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                                <div 
                                    className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                                        msg.role === 'user' 
                                            ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tr-none' 
                                            : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                                    }`}
                                >
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-slate-600 mt-1 px-1">{msg.timestamp}</span>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                        
                        {isChatThinking && (
                             <div className="flex flex-col items-end animate-pulse">
                                <div className="bg-slate-800 border border-slate-700 text-slate-400 text-xs px-3 py-2 rounded-lg rounded-tl-none">
                                    در حال تفکر و بررسی...
                                </div>
                             </div>
                        )}
                    </div>

                    <div className="bg-slate-800 p-3 border-t border-slate-700">
                        <div className="flex gap-2">
                             <input 
                                type="text" 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="دستور یا سوال خود را بنویسید..."
                                className="flex-grow bg-slate-950 text-slate-200 text-sm rounded border border-slate-700 px-3 py-2 focus:border-blue-500 outline-none"
                                disabled={isChatThinking}
                             />
                             <button 
                                onClick={handleSendMessage}
                                disabled={isChatThinking || !chatInput.trim()}
                                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white p-2 rounded transition-colors"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 rotate-180" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                             </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-row-reverse items-end gap-3">
                {/* Chat Toggle Button */}
                <button 
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg shadow-blue-900/40 transition-transform hover:scale-105 flex items-center justify-center group relative"
                >
                    {!isChatOpen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </button>
                
                {/* Stealth Node Button */}
                <button 
                    onClick={() => setIsNodePanelOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-white p-2 rounded-full border border-slate-700 shadow-lg transition-all"
                    title="Network Status"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                </button>
            </div>

        </div>
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);
