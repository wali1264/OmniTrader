
import React, { useState } from 'react';
import { analyzeUrology } from '../services/geminiService';
import { UrologyAnalysis } from '../types';
import { Droplets, Activity, AlertCircle, CheckCircle, Upload, CircleDashed, TestTube } from 'lucide-react';

type Tab = 'dipstick' | 'stone' | 'function';

const Urology: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dipstick');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UrologyAnalysis | null>(null);

  // Image State (Dipstick/Stone)
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Function Data
  const [kidneyData, setKidneyData] = useState({
    creatinine: '',
    age: '',
    weight: '',
    gender: 'male'
  });

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (activeTab === 'function') {
        if (!kidneyData.creatinine) return;
        setLoading(true);
        try {
            const res = await analyzeUrology(kidneyData, 'function');
            setResult(res);
        } catch (e) {
            console.error(e);
            alert('خطا در محاسبه عملکرد کلیه');
        } finally {
            setLoading(false);
        }
    } else {
        if (!image) return;
        setLoading(true);
        try {
            const res = await analyzeUrology(image, activeTab);
            setResult(res);
        } catch (e) {
            console.error(e);
            alert('خطا در آنالیز تصویر');
        } finally {
            setLoading(false);
        }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Droplets className="text-blue-600 w-10 h-10" />
        <div>
          <h2 className="text-3xl font-bold text-gray-800">دپارتمان کلیه و مجاری ادراری</h2>
          <p className="text-gray-500">Urology & Nephrology Intelligence</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl p-2 shadow-sm border border-gray-100 max-w-3xl">
        <button
          onClick={() => { setActiveTab('dipstick'); setResult(null); setImage(null); setPreview(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'dipstick' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <TestTube /> اسکنر نوار ادرار
        </button>
        <button
          onClick={() => { setActiveTab('stone'); setResult(null); setImage(null); setPreview(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'stone' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <CircleDashed /> سنگ‌شناس (Stone)
        </button>
        <button
          onClick={() => { setActiveTab('function'); setResult(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'function' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Activity /> عملکرد کلیه (GFR)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 h-fit">
          
          {(activeTab === 'dipstick' || activeTab === 'stone') && (
            <div className="space-y-6">
              <h3 className="font-bold text-gray-800">
                {activeTab === 'dipstick' ? 'آپلود عکس نوار ادرار (Dipstick)' : 'آپلود سونوگرافی/رادیولوژی کلیه'}
              </h3>
              <p className="text-sm text-gray-500">
                {activeTab === 'dipstick' 
                  ? 'عکس نوار تست ادرار را آپلود کنید تا هوش مصنوعی تغییر رنگ پدها را آنالیز کند.' 
                  : 'برای تشخیص سنگ، هیدرونفروز و انسداد مجاری ادراری.'}
              </p>
              
              <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-2xl h-80 flex flex-col items-center justify-center relative overflow-hidden group">
                 <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImage} />
                 {preview ? (
                   <img src={preview} className="w-full h-full object-contain" alt="Scan" />
                 ) : (
                   <div className="text-center p-4">
                     {activeTab === 'dipstick' ? <TestTube className="mx-auto text-blue-400 w-12 h-12 mb-3" /> : <CircleDashed className="mx-auto text-blue-400 w-12 h-12 mb-3" />}
                     <p className="text-gray-600 font-medium">تصویر را اینجا رها کنید</p>
                   </div>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'function' && (
            <div className="space-y-4">
               <h3 className="font-bold text-gray-800 mb-4">ماشین حساب عملکرد کلیه و مزاج</h3>
               
               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">کراتینین سرم (Cr mg/dL)</label>
                 <input type="number" step="0.1" className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={kidneyData.creatinine} onChange={e => setKidneyData({...kidneyData, creatinine: e.target.value})} />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">سن</label>
                    <input type="number" className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={kidneyData.age} onChange={e => setKidneyData({...kidneyData, age: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">وزن (kg)</label>
                    <input type="number" className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={kidneyData.weight} onChange={e => setKidneyData({...kidneyData, weight: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">جنسیت</label>
                 <select className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={kidneyData.gender} onChange={e => setKidneyData({...kidneyData, gender: e.target.value})}>
                     <option value="male">آقا</option>
                     <option value="female">خانم</option>
                 </select>
               </div>
            </div>
          )}

          <button 
            onClick={handleAnalyze}
            disabled={loading || (activeTab !== 'function' && !image)}
            className="w-full mt-6 bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'در حال آنالیز کلیوی...' : 'شروع آنالیز'}
          </button>
        </div>

        {/* Result Card */}
        <div className="space-y-6">
           {result ? (
             <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 animate-fade-in">
                <div className={`p-6 text-white flex justify-between items-center ${
                  result.severity === 'critical' ? 'bg-red-600' : 
                  result.severity === 'concern' ? 'bg-orange-500' : 'bg-green-600'
                }`}>
                   <div>
                     <h3 className="text-xl font-bold">نتیجه آنالیز</h3>
                     <p className="text-white/80 text-sm mt-1">{result.diagnosis}</p>
                   </div>
                   {result.severity === 'critical' ? <AlertCircle size={32} /> : <CheckCircle size={32} />}
                </div>

                <div className="p-6 space-y-6">
                   
                   {/* Dipstick Results */}
                   {result.dipstickValues && (
                     <div className="grid grid-cols-2 gap-2">
                       {result.dipstickValues.map((d, i) => (
                         <div key={i} className={`p-2 rounded-lg text-sm border flex justify-between items-center ${d.status === 'Abnormal' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
                           <span className="font-bold">{d.parameter}</span>
                           <span>{d.value}</span>
                         </div>
                       ))}
                     </div>
                   )}

                   {/* Stone Details */}
                   {result.stoneDetails && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                         <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">اندازه سنگ:</span>
                            <span className="font-bold text-gray-800">{result.stoneDetails.size}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">محل سنگ:</span>
                            <span className="font-bold text-gray-800">{result.stoneDetails.location}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">احتمال دفع خودبه‌خودی:</span>
                            <span className={`font-bold ${result.stoneDetails.passability.includes('High') ? 'text-green-600' : 'text-red-600'}`}>
                               {result.stoneDetails.passability}
                            </span>
                         </div>
                      </div>
                   )}

                   {/* Kidney Function */}
                   {result.kidneyFunction && (
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-xl text-center">
                           <span className="text-xs text-blue-500 uppercase font-bold">eGFR</span>
                           <p className="text-2xl font-bold text-blue-900">{result.kidneyFunction.gfr}</p>
                           <p className="text-xs text-blue-400 mt-1">{result.kidneyFunction.stage}</p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-xl text-center">
                           <span className="text-xs text-amber-500 uppercase font-bold">مزاج کلیه</span>
                           <p className="text-xl font-bold text-amber-900 mt-1">{result.kidneyFunction.mizaj}</p>
                        </div>
                     </div>
                   )}

                   <div>
                      <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">یافته‌های بالینی</h4>
                      <ul className="space-y-2">
                        {result.findings.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {f}
                          </li>
                        ))}
                      </ul>
                   </div>

                   <div className="bg-blue-50 p-4 rounded-xl">
                      <h4 className="font-bold text-blue-800 mb-2">توصیه‌ها</h4>
                      <ul className="space-y-1">
                        {result.recommendations.map((r, i) => (
                          <li key={i} className="text-sm text-blue-900">• {r}</li>
                        ))}
                      </ul>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-full bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 p-8 text-center opacity-70">
                <Droplets size={48} className="mb-4" />
                <p>منتظر داده‌ها برای آنالیز کلیوی...</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Urology;
