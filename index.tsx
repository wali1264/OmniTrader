
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";

// --- Configuration & Constants ---
const MODEL_NAME = "gemini-2.5-flash"; 

// Helper to safely retrieve API Key from various environment configurations (Vite, Webpack, Node)
const getApiKey = () => {
  // 1. Try Vite standard (import.meta.env)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      if (import.meta.env.VITE_GOOGLE_GENAI_TOKEN) return import.meta.env.VITE_GOOGLE_GENAI_TOKEN;
      // @ts-ignore
      if (import.meta.env.API_KEY) return import.meta.env.API_KEY;
    }
  } catch (e) {}

  // 2. Try standard process.env (Webpack/Next.js/Node)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env['VITE_GOOGLE_GENAI_TOKEN']) return process.env['VITE_GOOGLE_GENAI_TOKEN'];
      if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch (e) {}

  return "";
};

const API_KEY = getApiKey();

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

type RiskProfile = "conservative" | "moderate" | "aggressive";
type TradingStyle = "scalping" | "day" | "swing";

// --- Main Application Component ---
const App = () => {
  // --- State Management ---
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisSources, setAnalysisSources] = useState<GroundingSource[]>([]);
  
  // Phase 2 & 3 States
  const [autoMode, setAutoMode] = useState(false);
  const [scanInterval, setScanInterval] = useState(15000); 
  const [lastAnalysisText, setLastAnalysisText] = useState<string>("");
  const [enableNews, setEnableNews] = useState(true);

  // Phase 4 States: Strategy & Risk
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("moderate");
  const [tradingStyle, setTradingStyle] = useState<TradingStyle>("day");

  // Phase 5 States: Voice & Polish
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastSpokenText, setLastSpokenText] = useState("");

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

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatOpen]);

  // --- Core Logic: Capture & Analyze ---
  const analyzeScreen = useCallback(async (isAuto = false) => {
    if (!streamRef.current || !videoRef.current || !canvasRef.current) {
      if (!isAuto) addLog("error", "تصویر زنده‌ای برای تحلیل وجود ندارد.");
      return;
    }

    if (isAnalyzing) return;

    if (!API_KEY) {
        addLog("error", "کلید API یافت نشد. لطفاً تنظیمات را بررسی کنید.");
        return;
    }

    setIsAnalyzing(true);
    if (!isAuto) addLog("info", "در حال اسکن بازار و تحلیل...");

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

      // Initialize AI
      const ai = new GoogleGenAI({ apiKey: API_KEY });

      const contextPrompt = lastAnalysisText 
        ? `خلاصه تحلیل قبلی: "${lastAnalysisText.substring(0, 300)}..."` 
        : "بدون سابقه قبلی.";

      // Phase 4: Strategy Injection (Translated)
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
        
        دستورالعمل مدیریت ریسک:
        - اگر 'محافظه‌کار' است: فقط زمانی سیگنال ورود بده که تحلیل تکنیکال و فاندامنتال (اخبار) هر دو تایید کنند.
        - اگر 'تهاجمی' است: می‌توانی روی شکست‌های (Breakout) تکنیکال سیگنال بدهی حتی اگر خبر خاصی نباشد.
        - همیشه حد ضرر (SL) و حد سود (TP) دقیق و منطقی پیشنهاد بده.
      `;

      const prompt = `
        تو 'آمنی‌تریدر' هستی، یک دستیار فوق‌تخصص و هوشمند برای معامله‌گری در بازارهای مالی.
        
        ${contextPrompt}
        ${strategyPrompt}
        
        وظیفه:
        1. **شناسایی بصری**: تشخیص بده چه نمادی روی نمودار است (مثلا طلا/XAUUSD، بیت‌کوین، یورو/دلار).
        2. **تحلیل تکنیکال**: کندل‌ها، روندها، خطوط حمایت/مقاومت و الگوهای کلاسیک را بررسی کن.
        ${enableNews ? '3. **تحلیل فاندامنتال**: از ابزار گوگل سرچ استفاده کن و اخبار مهم 24 ساعت گذشته مرتبط با این نماد را بررسی کن.' : ''}
        4. **نتیجه‌گیری**: بر اساس استراتژی کاربر، یک تصمیم قاطع بگیر.
        
        فرمت خروجی (دقیقاً به همین صورت و به زبان فارسی بنویس):
        [نماد: نام نماد]
        [سیگنال: خرید / فروش / صبر]
        [اطمینان: 0-100%]
        [حد ضرر: عدد] | [حد سود: عدد]
        
        **تحلیل جامع:**
        (توضیحات تخصصی اما روان به زبان فارسی. چرا این تصمیم را گرفتی؟ ریسک معامله کجاست؟ به اخبار اشاره کن.)
      `;

      // Tools config
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

      // Extract Text
      const text = response.text || "تحلیلی تولید نشد.";
      
      // Extract Grounding Sources
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
      
      // Check for signals (Persian Keywords)
      const hasBuy = text.includes("سیگنال: خرید");
      const hasSell = text.includes("سیگنال: فروش");

      if (hasBuy || hasSell) {
         addLog("alert", `سیگنال معاملاتی شناسایی شد: ${hasBuy ? 'خرید' : 'فروش'}`);
         
         // Voice Alert Logic (Phase 5)
         if (voiceEnabled && text !== lastSpokenText) {
             const assetMatch = text.match(/\[نماد:\s*(.*?)\]/);
             const assetName = assetMatch ? assetMatch[1] : "بازار";
             const action = hasBuy ? "خرید" : "فروش";
             speak(`توجه کنید. سیگنال ${action} برای ${assetName} صادر شد. لطفاً تحلیل را بررسی کنید.`);
             setLastSpokenText(text); 
         }

      } else if (!isAuto) {
         addLog("analysis", "تحلیل انجام شد. سیگنال قطعی وجود ندارد.");
      }

    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      // Handle missing API key error gracefully in logs
      if (err.message && err.message.includes("API key")) {
          addLog("error", "خطای کلید API: لطفاً متغیر محیطی VITE_GOOGLE_GENAI_TOKEN را بررسی کنید.");
      } else {
          addLog("error", `خطا در تحلیل: ${err.message}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, lastAnalysisText, enableNews, riskProfile, tradingStyle, voiceEnabled, lastSpokenText, speak]);

  // --- Chat Logic ---
  const handleSendMessage = async () => {
      if (!chatInput.trim() || isChatThinking) return;

      if (!API_KEY) {
        setChatMessages(prev => [...prev, { role: 'model', text: 'خطا: کلید API یافت نشد. لطفاً تنظیمات ورسل را بررسی کنید.', timestamp: new Date().toLocaleTimeString('fa-IR') }]);
        return;
      }

      const userMsg = chatInput;
      setChatInput("");
      setChatMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: new Date().toLocaleTimeString('fa-IR') }]);
      setIsChatThinking(true);

      try {
          const ai = new GoogleGenAI({ apiKey: API_KEY });
          
          // Context for the chat (Aware of the visual analysis)
          const context = lastAnalysisText 
            ? `آخرین تحلیل تصویری که سیستم انجام داده این است: "${lastAnalysisText}". اگر کاربر سوالی راجع به نمودار فعلی پرسید از این اطلاعات استفاده کن.` 
            : "هنوز تحلیل تصویری انجام نشده است.";

          const systemInstruction = `
            شما یک دستیار تریدر ارشد با ۲۰ سال سابقه هستید. نام شما 'آمنی‌تریدر' است.
            ${context}
            کاربر ممکن است از شما بخواهد اخبار را چک کنید یا نظر تخصصی بدهید.
            پاسخ‌ها باید کوتاه، تخصصی و به زبان فارسی باشد.
            اگر کاربر درخواست بررسی فوری اخبار یا وب را داشت، حتما از ابزار جستجو استفاده کن.
          `;

          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: [{ role: 'user', parts: [{ text: systemInstruction + "\n\n" + userMsg }] }],
              config: {
                  tools: [{ googleSearch: {} }] // Enable search for chat too
              }
          });

          const responseText = response.text || "متاسفانه نتوانستم پاسخ دهم.";
          
          setChatMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: new Date().toLocaleTimeString('fa-IR') }]);

      } catch (err: any) {
          setChatMessages(prev => [...prev, { role: 'model', text: `خطا در ارتباط: ${err.message}`, timestamp: new Date().toLocaleTimeString('fa-IR') }]);
      } finally {
          setIsChatThinking(false);
      }
  };


  // --- Effects ---
  useEffect(() => {
    if (autoMode && isCapturing) {
        // Translate log for auto mode
        const profileFa = riskProfile === 'conservative' ? 'محافظه‌کار' : riskProfile === 'aggressive' ? 'تهاجمی' : 'متعادل';
        const styleFa = tradingStyle === 'scalping' ? 'اسکالپ' : tradingStyle === 'day' ? 'روزانه' : 'سوینگ';
        
        addLog("info", `خلبان خودکار: پایش هر ${scanInterval/1000} ثانیه [${profileFa}/${styleFa}]`);
      
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
                             ریسک: <span className="text-purple-400 font-bold">{
                                riskProfile === 'conservative' ? 'محافظه‌کار' : riskProfile === 'moderate' ? 'متعادل' : 'تهاجمی'
                             }</span>
                        </div>
                        <div className="text-xs text-slate-400">
                             سبک: <span className="text-blue-400 font-bold">{
                                tradingStyle === 'scalping' ? 'اسکالپ' : tradingStyle === 'day' ? 'روزانه' : 'سوینگ'
                             }</span>
                        </div>
                    </div>
                    {isAnalyzing && (
                        <div className="flex items-center gap-2 bg-amber-600/20 border border-amber-500/50 px-3 py-1 rounded text-amber-300 text-xs font-bold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            در حال پردازش...
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
             <div className="bg-slate-900 rounded-lg p-3 border border-slate-800 flex flex-col gap-2">
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
                            <label htmlFor="newsToggle" className="text-xs text-slate-300 cursor-pointer select-none">همگام‌سازی اخبار</label>
                        </div>

                        <div className="flex items-center gap-2" title="فعال سازی هشدار صوتی">
                            <input 
                                type="checkbox" 
                                id="voiceToggle"
                                checked={voiceEnabled}
                                onChange={(e) => setVoiceEnabled(e.target.checked)}
                                className="w-4 h-4 accent-purple-500 cursor-pointer"
                            />
                            <label htmlFor="voiceToggle" className="text-xs text-slate-300 cursor-pointer select-none flex items-center gap-1">
                                هشدار صوتی
                                {voiceEnabled && <span className="text-[8px] text-green-400">●</span>}
                            </label>
                        </div>
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

                 {/* Bottom Row: Strategy Dropdowns */}
                 <div className="grid grid-cols-2 gap-2">
                     <select 
                        value={riskProfile}
                        onChange={(e) => setRiskProfile(e.target.value as RiskProfile)}
                        className="bg-slate-800 text-xs text-slate-300 border border-slate-700 rounded px-2 py-1 outline-none focus:border-purple-500 cursor-pointer hover:bg-slate-750"
                     >
                         <option value="conservative">محافظه‌کار (کم‌ریسک)</option>
                         <option value="moderate">متعادل (میانه)</option>
                         <option value="aggressive">تهاجمی (پرریسک)</option>
                     </select>
                     
                     <select 
                        value={tradingStyle}
                        onChange={(e) => setTradingStyle(e.target.value as TradingStyle)}
                        className="bg-slate-800 text-xs text-slate-300 border border-slate-700 rounded px-2 py-1 outline-none focus:border-blue-500 cursor-pointer hover:bg-slate-750"
                     >
                         <option value="scalping">اسکالپ (نوسان‌گیری)</option>
                         <option value="day">ترید روزانه</option>
                         <option value="swing">سوینگ (میان‌مدت)</option>
                     </select>
                 </div>
             </div>
          </div>
        </div>

        {/* Left Panel (Originally Right): Intelligence Hub */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full min-h-[500px]">
          
          {/* Analysis Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-0 flex flex-col flex-grow shadow-lg overflow-hidden relative group">
            <div className="bg-slate-800/50 p-3 border-b border-slate-700 flex justify-between items-center">
                <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    هوش مرکزی
                </h2>
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
            
            <div className="flex-grow p-4 overflow-y-auto bg-slate-950/50 relative">
              {analysisResult ? (
                <div className="space-y-4 animate-fadeIn">
                    <div className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap text-justify">
                        {analysisResult}
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

        {/* Chat Features: Floating Action Button & Chat Window */}
        <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-4" dir="rtl">
            
            {/* Chat Window (Popup) */}
            {isChatOpen && (
                <div className="w-80 md:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn mb-2" style={{ maxHeight: '600px', height: '500px' }}>
                    
                    {/* Chat Header */}
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

                    {/* Messages Area */}
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

                    {/* Input Area */}
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

            {/* Toggle Button (FAB) */}
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
                
                {/* Notification Badge (Optional aesthetic) */}
                {!isChatOpen && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </button>

        </div>
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);
