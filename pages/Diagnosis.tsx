
import React, { useState, useEffect, useRef } from 'react';
import { PatientRecord, DualDiagnosis, ChatMessage, AppRoute } from '../types';
import { analyzePatient, generateConsensus, generateAudioSummary, createMedicalChat, generateTimelineAnalysis } from '../services/geminiService';
import { saveRecord, getRecordsByName } from '../services/db';
import { Pill, Leaf, Users, Loader2, RefreshCcw, MessageSquare, Send, Play, Pause, Volume2, ArrowLeft, FileText, WifiOff, Save, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Chat } from "@google/genai";

interface DiagnosisProps {
  patientRecord: PatientRecord | null;
  onNavigate: (route: AppRoute, record: PatientRecord) => void;
}

const Diagnosis: React.FC<DiagnosisProps> = ({ patientRecord, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<DualDiagnosis | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Manual Entry Mode (Offline or fallback)
  const [manualMode, setManualMode] = useState(false);
  const [manualModernDx, setManualModernDx] = useState('');
  const [manualModernPlan, setManualModernPlan] = useState('');
  const [manualTradDx, setManualTradDx] = useState('');
  const [manualTradPlan, setManualTradPlan] = useState('');

  // Consensus State
  const [consensusLoading, setConsensusLoading] = useState(false);
  const [consensus, setConsensus] = useState<string | null>(null);
  
  // Timeline State
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineReport, setTimelineReport] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<PatientRecord[]>([]);

  // Audio State
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Chat State
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Active Tab for Right Sidebar
  const [activeTab, setActiveTab] = useState<'consensus' | 'timeline'>('consensus');

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    if (!patientRecord) return;
    
    const initialize = async () => {
      setLoading(true);
      try {
        // Check if we already have diagnosis in the record (loaded from DB dashboard)
        if (patientRecord.status === 'diagnosed' && patientRecord.diagnosis) {
           setResults(patientRecord.diagnosis);
           setConsensus(patientRecord.consensus || null);
           setLoading(false);
        } else if (!navigator.onLine) {
           // Offline Mode - Switch to Manual
           setManualMode(true);
           setLoading(false);
        } else {
           // New diagnosis required & Online
           try {
             const data = await analyzePatient(patientRecord);
             setResults(data);
             
             // Auto-save the initial diagnosis to DB (as provisional)
             const updatedRecord: PatientRecord = {
               ...patientRecord,
               status: 'diagnosed',
               diagnosis: data
             };
             await saveRecord(updatedRecord);
             setLoading(false);
           } catch (err) {
             console.error("AI Failed", err);
             // Fallback to manual if AI fails
             setManualMode(true);
             setLoading(false);
           }
        }

        // Fetch History for Timeline (Local DB - Works Offline)
        const history = await getRecordsByName(patientRecord.name);
        // Filter out current record
        const pastRecords = history.filter(h => h.id !== patientRecord.id);
        setHistoryRecords(pastRecords);

      } catch (error) {
        console.error("Diagnosis initialization error:", error);
        setLoading(false);
      }
    };
    initialize();
  }, [patientRecord]);

  const handleManualSave = async () => {
    if (!patientRecord) return;
    
    const manualDiagnosis: DualDiagnosis = {
       modern: {
         diagnosis: manualModernDx,
         reasoning: 'تشخیص دستی پزشک (حالت آفلاین)',
         treatmentPlan: manualModernPlan.split('\n').filter(l => l.trim()),
         lifestyle: [],
         warnings: []
       },
       traditional: {
         diagnosis: manualTradDx,
         reasoning: 'تشخیص دستی پزشک (حالت آفلاین)',
         treatmentPlan: manualTradPlan.split('\n').filter(l => l.trim()),
         lifestyle: [],
         warnings: []
       }
    };

    const updatedRecord: PatientRecord = {
       ...patientRecord,
       status: 'diagnosed',
       diagnosis: manualDiagnosis,
       consensus: 'تشخیص به صورت دستی در حالت آفلاین ثبت شد.'
    };

    await saveRecord(updatedRecord);
    setResults(manualDiagnosis);
    setConsensus(updatedRecord.consensus!);
    setManualMode(false);
  };

  const handleConsensus = async () => {
    if (!results || !patientRecord) return;
    if (!isOnline) {
      alert("برای ایجاد جمع‌بندی هوشمند به اینترنت نیاز دارید.");
      return;
    }

    setConsensusLoading(true);
    try {
      const text = await generateConsensus(results.modern, results.traditional);
      setConsensus(text);
      
      // Save Consensus to DB
      const updatedRecord: PatientRecord = {
          ...patientRecord,
          diagnosis: results, 
          consensus: text,
          status: 'diagnosed'
      };
      await saveRecord(updatedRecord);

      // Initialize chat
      const chat = createMedicalChat(patientRecord, results, text);
      setChatSession(chat);
      setMessages([{ id: 'init', role: 'model', text: 'من شورای پزشکی طبیب هوشمند هستم. اگر سوالی در مورد تشخیص یا تداخلات دارویی دارید، بپرسید.' }]);
    } catch (error) {
      console.error(error);
      alert("خطا در ارتباط با هوش مصنوعی");
    } finally {
      setConsensusLoading(false);
    }
  };

  const handleTimeline = async () => {
    if (!patientRecord || historyRecords.length === 0) return;
    if (!isOnline) {
       setTimelineReport("تحلیل روند درمان با هوش مصنوعی نیازمند اینترنت است. اما سوابق بیمار در لیست موجود است.");
       return;
    }
    setTimelineLoading(true);
    try {
        const report = await generateTimelineAnalysis(patientRecord, historyRecords);
        setTimelineReport(report);
    } catch (e) {
        console.error(e);
    } finally {
        setTimelineLoading(false);
    }
  }

  const handleGenerateAudio = async () => {
    if (!consensus) return;
    if (!isOnline) {
      alert("تولید صدا نیازمند اینترنت است.");
      return;
    }
    setAudioLoading(true);
    try {
      const base64 = await generateAudioSummary(consensus);
      if (base64) {
        const url = `data:audio/mp3;base64,${base64}`;
        setAudioUrl(url);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
          }
        }, 100);
      }
    } catch (e) {
      console.error(e);
      alert('خطا در تولید صدا');
    } finally {
      setAudioLoading(false);
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const sendMessage = async () => {
    if (!inputMsg.trim() || !chatSession) return;
    if (!isOnline) {
       setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: inputMsg }, { id: (Date.now()+1).toString(), role: 'model', text: 'ارتباط با هوش مصنوعی قطع است.' }]);
       setInputMsg('');
       return;
    }

    const userText = inputMsg;
    setInputMsg('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText }]);
    setChatLoading(true);

    try {
      const result = await chatSession.sendMessage({ message: userText });
      const modelText = result.text;
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: modelText }]);
    } catch (e) {
      console.error(e);
    } finally {
      setChatLoading(false);
    }
  };

  const handleTransferToDesk = async () => {
    if (!patientRecord || !results) return;
    
    // Ensure the record is saved with the latest analysis before transferring
    const recordToTransfer: PatientRecord = {
        ...patientRecord,
        diagnosis: results,
        consensus: consensus || undefined,
        status: 'diagnosed'
    };
    
    await saveRecord(recordToTransfer);
    onNavigate(AppRoute.PRESCRIPTION, recordToTransfer);
  };

  if (!patientRecord) {
    return <div className="text-center p-10 text-gray-500">لطفا ابتدا اطلاعات بیمار را وارد کنید.</div>;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-6">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="text-blue-600 w-8 h-8" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-700">در حال مشاوره با پزشکان متخصص و حکیم...</h3>
        <p className="text-gray-500 animate-pulse">لطفا صبر کنید (نیاز به اینترنت)</p>
      </div>
    );
  }

  // MANUAL ENTRY MODE (Offline)
  if (manualMode) {
     return (
        <div className="space-y-6 pb-20 animate-fade-in">
           <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center gap-3 text-orange-800">
              <WifiOff />
              <div>
                 <h3 className="font-bold">حالت تشخیص دستی (آفلاین)</h3>
                 <p className="text-sm">اتصال به هوش مصنوعی برقرار نیست. لطفا تشخیص و طرح درمان را دستی وارد کنید تا در پرونده ذخیره شود.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <h3 className="font-bold text-blue-700 flex items-center gap-2 mb-4"><Pill /> تشخیص طب نوین</h3>
                 <div className="space-y-4">
                    <div>
                       <label className="text-sm font-bold text-gray-600">عنوان تشخیص</label>
                       <input className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" placeholder="مثال: دیابت نوع ۲" value={manualModernDx} onChange={e => setManualModernDx(e.target.value)} />
                    </div>
                    <div>
                       <label className="text-sm font-bold text-gray-600">برنامه درمانی (هر خط یک مورد)</label>
                       <textarea className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 h-32" placeholder="متفورمین 500..." value={manualModernPlan} onChange={e => setManualModernPlan(e.target.value)} />
                    </div>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <h3 className="font-bold text-amber-700 flex items-center gap-2 mb-4"><Leaf /> تشخیص طب سنتی</h3>
                 <div className="space-y-4">
                    <div>
                       <label className="text-sm font-bold text-gray-600">مزاج و تشخیص</label>
                       <input className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" placeholder="مثال: غلبه سودا" value={manualTradDx} onChange={e => setManualTradDx(e.target.value)} />
                    </div>
                    <div>
                       <label className="text-sm font-bold text-gray-600">تدابیر و گیاهان (هر خط یک مورد)</label>
                       <textarea className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 h-32" placeholder="سرکه انگبین..." value={manualTradPlan} onChange={e => setManualTradPlan(e.target.value)} />
                    </div>
                 </div>
              </div>
           </div>
           
           <button onClick={handleManualSave} disabled={!manualModernDx && !manualTradDx} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              <Save />
              ثبت تشخیص اولیه
           </button>
        </div>
     )
  }

  return (
    <div className="space-y-8 pb-32 relative">
      
      {/* Cards Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Modern Medicine Card */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-lg border border-blue-100 flex flex-col transform hover:scale-[1.01] transition-transform duration-300">
          <div className="bg-gradient-to-l from-blue-700 to-blue-500 p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Pill size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">پزشک متخصص نوین</h3>
                <p className="text-blue-100 text-sm">مبتنی بر شواهد بالینی</p>
              </div>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">تشخیص نهایی</span>
              <h4 className="text-xl font-bold text-gray-800 mt-2">{results?.modern.diagnosis}</h4>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">{results?.modern.reasoning}</p>
            
            <div className="mt-4 space-y-3">
               <h5 className="font-bold text-gray-700 border-b pb-2">برنامه درمانی</h5>
               <ul className="space-y-2">
                 {results?.modern.treatmentPlan.map((item, i) => (
                   <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                     <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                     {item}
                   </li>
                 ))}
               </ul>
            </div>
          </div>
        </div>

        {/* Traditional Medicine Card */}
        <div className="bg-amber-50 rounded-3xl overflow-hidden shadow-lg border border-amber-100 flex flex-col transform hover:scale-[1.01] transition-transform duration-300">
          <div className="bg-gradient-to-l from-amber-700 to-amber-600 p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Leaf size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">حکیم طب سنتی</h3>
                <p className="text-amber-100 text-sm">مبتنی بر مزاج و اخلاط</p>
              </div>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4">
            <div>
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">تشخیص مزاجی</span>
              <h4 className="text-xl font-bold text-gray-800 mt-2">{results?.traditional.diagnosis}</h4>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">{results?.traditional.reasoning}</p>
            
            <div className="mt-4 space-y-3">
               <h5 className="font-bold text-gray-800 border-b border-amber-200 pb-2">تدابیر درمانی و غذایی</h5>
               <ul className="space-y-2">
                 {results?.traditional.treatmentPlan.map((item, i) => (
                   <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                     <span className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-1.5 flex-shrink-0"></span>
                     {item}
                   </li>
                 ))}
               </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Analysis Section */}
      <div className="mt-12 bg-gray-900 text-gray-100 rounded-3xl p-1 shadow-2xl overflow-hidden min-h-[500px]">
        <div className="flex border-b border-gray-800">
           <button 
             onClick={() => setActiveTab('consensus')} 
             className={`flex-1 p-4 font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'consensus' ? 'bg-gray-800 text-white border-b-2 border-purple-500' : 'text-gray-500 hover:text-white'}`}
           >
             <Users size={20} />
             شورای پزشکی
           </button>
           <button 
             onClick={() => { setActiveTab('timeline'); if(!timelineReport) handleTimeline(); }} 
             disabled={historyRecords.length === 0}
             className={`flex-1 p-4 font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'timeline' ? 'bg-gray-800 text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-white disabled:opacity-30'}`}
           >
             <History size={20} />
             روند درمان (Timeline)
             {historyRecords.length > 0 && <span className="bg-blue-600 text-xs px-2 py-0.5 rounded-full">{historyRecords.length}</span>}
           </button>
        </div>

        <div className="p-8">
           {activeTab === 'consensus' ? (
             <>
               <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                 <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-tr from-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg shadow-purple-500/30">
                      <Users className="text-white" size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">جمع‌بندی نهایی</h3>
                      <p className="text-gray-400 text-sm">نتیجه نهایی شورا برای ثبت در پرونده</p>
                    </div>
                 </div>
                 
                 {!consensus ? (
                   <button 
                     onClick={handleConsensus} 
                     disabled={consensusLoading || !isOnline}
                     className="bg-white text-gray-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
                   >
                     {consensusLoading ? <Loader2 className="animate-spin" /> : isOnline ? <RefreshCcw /> : <WifiOff />}
                     {isOnline ? 'شروع شورای پزشکی' : 'آفلاین (غیرفعال)'}
                   </button>
                 ) : (
                    <div className="flex flex-wrap gap-2">
                       {audioUrl ? (
                          <button onClick={toggleAudio} className="bg-purple-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-purple-500 transition-all">
                             {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                             <span>{isPlaying ? 'توقف' : 'پخش'}</span>
                          </button>
                       ) : (
                          <button onClick={handleGenerateAudio} disabled={audioLoading || !isOnline} className="bg-gray-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-600 transition-all disabled:opacity-50">
                            {audioLoading ? <Loader2 size={18} className="animate-spin" /> : <Volume2 size={18} />}
                            <span>صدا</span>
                          </button>
                       )}
                       
                       {/* TRANSFER TO DESK BUTTON */}
                       <button onClick={handleTransferToDesk} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg font-bold">
                         <FileText size={18} />
                         <span>انتقال نسخه به میز کار پزشک</span>
                         <ArrowLeft size={18} />
                       </button>
                    </div>
                 )}
               </div>
               
               {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />}

               {consensus ? (
                 <div className="space-y-8 animate-fade-in">
                    <div className="bg-gray-800 rounded-2xl p-6 leading-relaxed text-gray-300">
                      <ReactMarkdown className="prose prose-invert max-w-none">{consensus}</ReactMarkdown>
                    </div>
                    <div className="border-t border-gray-700 pt-6">
                       <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                         <MessageSquare className="text-purple-400" />
                         گفتگو با شورای پزشکی
                       </h4>
                       <div className="bg-gray-950 rounded-2xl p-4 h-64 overflow-y-auto space-y-4 mb-4 border border-gray-800">
                          {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>
                                <p className="text-sm leading-relaxed">{msg.text}</p>
                              </div>
                            </div>
                          ))}
                       </div>
                       <div className="flex gap-2">
                         <input type="text" className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500" placeholder={isOnline ? "سوال..." : "آفلاین"} disabled={!isOnline} value={inputMsg} onChange={e => setInputMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} />
                         <button onClick={sendMessage} disabled={!inputMsg.trim() || chatLoading || !isOnline} className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-50 disabled:opacity-50"><Send size={20} /></button>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="h-48 border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center text-gray-500">
                    <p>{isOnline ? 'جهت دریافت جمع‌بندی نهایی کلیک کنید' : 'در حالت آفلاین شورای پزشکی هوشمند غیرفعال است.'}</p>
                 </div>
               )}
             </>
           ) : (
             <div className="animate-fade-in">
               <h3 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
                 <TrendingUp className="text-blue-500" />
                 گزارش پیشرفت درمان
               </h3>
               {timelineLoading ? (
                 <div className="flex items-center justify-center h-48">
                    <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
                 </div>
               ) : timelineReport ? (
                 <div className="bg-gray-800 rounded-2xl p-8 leading-relaxed text-gray-300">
                    <ReactMarkdown className="prose prose-invert max-w-none">{timelineReport}</ReactMarkdown>
                 </div>
               ) : (
                 <div className="text-gray-500 text-center">{historyRecords.length === 0 ? 'سابقه‌ای یافت نشد.' : isOnline ? 'داده‌ای تولید نشده است.' : 'تحلیل هوشمند نیازمند اینترنت است.'}</div>
               )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Diagnosis;
