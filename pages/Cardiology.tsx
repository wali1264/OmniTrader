
import React, { useState, useRef } from 'react';
import { analyzeECG, analyzeHeartSound, calculateCardiacRisk } from '../services/geminiService';
import { CardiologyAnalysis } from '../types';
import { Upload, HeartPulse, Activity, Mic, SquareActivity, AlertTriangle, CheckCircle, Play, MicOff, Loader2 } from 'lucide-react';

type Tab = 'ecg' | 'sound' | 'risk';

const Cardiology: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('ecg');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CardiologyAnalysis | null>(null);

  // ECG State
  const [ecgImage, setEcgImage] = useState<File | null>(null);
  const [ecgContext, setEcgContext] = useState('');
  const [ecgPreview, setEcgPreview] = useState<string | null>(null);

  // Sound State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Risk State
  const [riskData, setRiskData] = useState({
    age: '', gender: 'male', smoker: false, diabetic: false,
    bp: '', cholesterol: '', hdl: ''
  });

  // Handlers
  const handleEcgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEcgImage(file);
      setEcgPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleEcgAnalyze = async () => {
    if (!ecgImage) return;
    setLoading(true);
    try {
      const res = await analyzeECG(ecgImage, ecgContext);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('خطا در آنالیز نوار قلب');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setResult(null);
    } catch (err) {
      alert("دسترسی به میکروفون امکان‌پذیر نیست.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSoundAnalyze = async () => {
    if (!audioBlob) return;
    setLoading(true);
    try {
      const res = await analyzeHeartSound(audioBlob);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('خطا در آنالیز صدای قلب');
    } finally {
      setLoading(false);
    }
  };

  const handleRiskCalc = async () => {
    setLoading(true);
    const profile = `
      Age: ${riskData.age}, Gender: ${riskData.gender}
      Smoker: ${riskData.smoker ? 'Yes' : 'No'}, Diabetic: ${riskData.diabetic ? 'Yes' : 'No'}
      Systolic BP: ${riskData.bp}, Total Cholesterol: ${riskData.cholesterol}, HDL: ${riskData.hdl}
    `;
    try {
      const res = await calculateCardiacRisk(profile);
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center gap-3 mb-6">
        <HeartPulse className="text-red-600 w-10 h-10" />
        <div>
          <h2 className="text-3xl font-bold text-gray-800">مرکز تخصصی قلب و عروق</h2>
          <p className="text-gray-500">Cardiology & ECG Suite</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white rounded-2xl p-2 shadow-sm border border-gray-100 max-w-2xl">
        <button
          onClick={() => { setActiveTab('ecg'); setResult(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'ecg' ? 'bg-red-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Activity /> نوار قلب (ECG)
        </button>
        <button
          onClick={() => { setActiveTab('sound'); setResult(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'sound' ? 'bg-red-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Mic /> صدای قلب
        </button>
        <button
          onClick={() => { setActiveTab('risk'); setResult(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'risk' ? 'bg-red-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <SquareActivity /> ریسک فاکتور
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Section */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 h-fit">
          
          {activeTab === 'ecg' && (
            <div className="space-y-6">
              <h3 className="font-bold text-gray-800">آپلود نوار قلب</h3>
              <div className="border-2 border-dashed border-red-200 bg-red-50/30 rounded-2xl h-64 flex flex-col items-center justify-center relative overflow-hidden group">
                 <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleEcgFile} />
                 {ecgPreview ? (
                   <img src={ecgPreview} className="w-full h-full object-contain" alt="ECG" />
                 ) : (
                   <div className="text-center p-4">
                     <Activity className="mx-auto text-red-400 w-12 h-12 mb-3" />
                     <p className="text-gray-600 font-medium">تصویر نوار قلب را اینجا رها کنید</p>
                   </div>
                 )}
              </div>
              <textarea 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 h-24"
                placeholder="علائم بالینی (درد قفسه سینه، تنگی نفس، سابقه سکته...)"
                value={ecgContext}
                onChange={e => setEcgContext(e.target.value)}
              />
              <button 
                onClick={handleEcgAnalyze}
                disabled={!ecgImage || loading}
                className="w-full bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'در حال آنالیز...' : 'تفسیر نوار قلب'}
              </button>
            </div>
          )}

          {activeTab === 'sound' && (
            <div className="space-y-8 text-center py-10">
              <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-100 animate-pulse' : 'bg-gray-100'}`}>
                <HeartPulse size={64} className={isRecording ? 'text-red-600' : 'text-gray-400'} />
              </div>
              <p className="text-gray-600">
                {isRecording ? 'در حال ضبط صدای قلب...' : audioBlob ? 'صدای قلب ضبط شد' : 'جهت ضبط دکمه زیر را فشار دهید'}
              </p>
              
              <div className="flex justify-center gap-4">
                 <button
                   onClick={isRecording ? stopRecording : startRecording}
                   className={`p-6 rounded-full shadow-xl transition-all ${isRecording ? 'bg-red-600 text-white' : 'bg-white text-red-600 border border-red-100'}`}
                 >
                   {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                 </button>
              </div>

              {audioBlob && !isRecording && (
                <button 
                  onClick={handleSoundAnalyze}
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'در حال گوش دادن...' : 'آنالیز صدا (Phonocardiogram)'}
                </button>
              )}
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-4">
               <h3 className="font-bold text-gray-800 mb-4">ماشین حساب ریسک قلبی (10-Year ASCVD)</h3>
               <div className="grid grid-cols-2 gap-4">
                 <input type="number" placeholder="سن" className="p-3 bg-gray-50 rounded-xl" value={riskData.age} onChange={e => setRiskData({...riskData, age: e.target.value})} />
                 <select className="p-3 bg-gray-50 rounded-xl" value={riskData.gender} onChange={e => setRiskData({...riskData, gender: e.target.value as any})}>
                   <option value="male">آقا</option>
                   <option value="female">خانم</option>
                 </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <input type="text" placeholder="فشار خون (mmHg)" className="p-3 bg-gray-50 rounded-xl" value={riskData.bp} onChange={e => setRiskData({...riskData, bp: e.target.value})} />
                 <input type="text" placeholder="کلسترول کل" className="p-3 bg-gray-50 rounded-xl" value={riskData.cholesterol} onChange={e => setRiskData({...riskData, cholesterol: e.target.value})} />
               </div>
               <div className="flex gap-4">
                 <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-xl flex-1">
                   <input type="checkbox" checked={riskData.smoker} onChange={e => setRiskData({...riskData, smoker: e.target.checked})} />
                   <span>سیگاری</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-xl flex-1">
                   <input type="checkbox" checked={riskData.diabetic} onChange={e => setRiskData({...riskData, diabetic: e.target.checked})} />
                   <span>دیابت</span>
                 </label>
               </div>
               <button 
                onClick={handleRiskCalc}
                disabled={loading}
                className="w-full mt-4 bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'در حال محاسبه...' : 'محاسبه ریسک'}
              </button>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-6">
           {result ? (
             <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 animate-fade-in">
                <div className={`p-6 text-white flex justify-between items-center ${
                  result.severity === 'critical' ? 'bg-red-600 animate-pulse' : 
                  result.severity === 'abnormal' ? 'bg-orange-500' : 'bg-green-600'
                }`}>
                   <div>
                     <h3 className="text-xl font-bold">
                        {result.type === 'ecg' ? 'تفسیر نوار قلب' : result.type === 'sound' ? 'تفسیر صدای قلب' : 'ارزیابی ریسک'}
                     </h3>
                     <p className="text-white/80 text-sm mt-1">{result.impression}</p>
                   </div>
                   {result.severity === 'critical' ? <AlertTriangle size={32} /> : <CheckCircle size={32} />}
                </div>

                <div className="p-6 space-y-6">
                   {result.metrics && (
                     <div className="grid grid-cols-3 gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        {result.metrics.rate && (
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Rate</p>
                            <p className="font-bold text-gray-800">{result.metrics.rate}</p>
                          </div>
                        )}
                        {result.metrics.rhythm && (
                          <div className="text-center border-x border-gray-200">
                            <p className="text-xs text-gray-500">Rhythm</p>
                            <p className="font-bold text-gray-800">{result.metrics.rhythm}</p>
                          </div>
                        )}
                        {result.metrics.intervals && (
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Intervals</p>
                            <p className="font-bold text-gray-800">{result.metrics.intervals}</p>
                          </div>
                        )}
                     </div>
                   )}

                   <div>
                      <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">یافته‌های بالینی</h4>
                      <ul className="space-y-2">
                        {result.findings.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {f}
                          </li>
                        ))}
                      </ul>
                   </div>

                   <div className="bg-red-50 p-4 rounded-xl">
                      <h4 className="font-bold text-red-800 mb-2">توصیه‌های درمانی</h4>
                      <ul className="space-y-1">
                        {result.recommendations.map((r, i) => (
                          <li key={i} className="text-sm text-red-900">• {r}</li>
                        ))}
                      </ul>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-full bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 p-8 text-center opacity-70">
                <Activity size={48} className="mb-4" />
                <p>منتظر داده‌ها برای آنالیز...</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Cardiology;
