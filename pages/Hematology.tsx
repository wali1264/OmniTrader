
import React, { useState } from 'react';
import { analyzeHematology } from '../services/geminiService';
import { HematologyAnalysis } from '../types';
import { Droplet, Microscope, FileText, TrendingUp, AlertCircle, CheckCircle, Upload, Activity } from 'lucide-react';

type Tab = 'smear' | 'pathology' | 'markers';

const Hematology: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('smear');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HematologyAnalysis | null>(null);

  // Image State (Smear/Pathology)
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Markers Data
  const [markerData, setMarkerData] = useState({
    name: 'PSA',
    current: '',
    unit: 'ng/mL',
    previous: '',
    history: ''
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
    if (activeTab === 'markers') {
        if (!markerData.current) return;
        setLoading(true);
        try {
            const res = await analyzeHematology(markerData, 'markers');
            setResult(res);
        } catch (e) {
            console.error(e);
            alert('خطا در تحلیل تومور مارکر');
        } finally {
            setLoading(false);
        }
    } else {
        if (!image) return;
        setLoading(true);
        try {
            const res = await analyzeHematology(image, activeTab);
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
        <Droplet className="text-rose-600 w-10 h-10" />
        <div>
          <h2 className="text-3xl font-bold text-gray-800">دپارتمان خون، سرطان‌شناسی و پاتولوژی</h2>
          <p className="text-gray-500">Hematology, Oncology & Pathology Intelligence</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl p-2 shadow-sm border border-gray-100 max-w-3xl">
        <button
          onClick={() => { setActiveTab('smear'); setResult(null); setImage(null); setPreview(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'smear' ? 'bg-rose-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Microscope /> لام خون محیطی
        </button>
        <button
          onClick={() => { setActiveTab('pathology'); setResult(null); setImage(null); setPreview(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'pathology' ? 'bg-rose-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <FileText /> پاتولوژی و بیوپسی
        </button>
        <button
          onClick={() => { setActiveTab('markers'); setResult(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'markers' ? 'bg-rose-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <TrendingUp /> تومور مارکرها
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 h-fit">
          
          {(activeTab === 'smear' || activeTab === 'pathology') && (
            <div className="space-y-6">
              <h3 className="font-bold text-gray-800">
                {activeTab === 'smear' ? 'آپلود تصویر میکروسکوپی (Smear)' : 'آپلود گزارش یا اسلاید پاتولوژی'}
              </h3>
              <p className="text-sm text-gray-500">
                {activeTab === 'smear' 
                  ? 'تشخیص کم‌خونی (داسی شکل/فقر آهن)، لوسمی، مالاریا و ناهنجاری‌های پلاکتی.' 
                  : 'تفسیر گزارش‌های پیچیده بیوپسی، تشخیص گرید و استیج سرطان.'}
              </p>
              
              <div className="border-2 border-dashed border-rose-200 bg-rose-50/30 rounded-2xl h-80 flex flex-col items-center justify-center relative overflow-hidden group">
                 <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImage} />
                 {preview ? (
                   <img src={preview} className="w-full h-full object-contain" alt="Microscope" />
                 ) : (
                   <div className="text-center p-4">
                     {activeTab === 'smear' ? <Microscope className="mx-auto text-rose-400 w-12 h-12 mb-3" /> : <FileText className="mx-auto text-rose-400 w-12 h-12 mb-3" />}
                     <p className="text-gray-600 font-medium">تصویر را اینجا رها کنید</p>
                   </div>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'markers' && (
            <div className="space-y-4">
               <h3 className="font-bold text-gray-800 mb-4">پایشگر هوشمند تومور مارکر (Onco-Tracker)</h3>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">نام مارکر</label>
                    <select className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-rose-500" value={markerData.name} onChange={e => setMarkerData({...markerData, name: e.target.value})}>
                        <option value="PSA">PSA (Prostate)</option>
                        <option value="CA-125">CA-125 (Ovarian)</option>
                        <option value="CEA">CEA (Colon/Breast)</option>
                        <option value="CA 19-9">CA 19-9 (Pancreas)</option>
                        <option value="AFP">AFP (Liver)</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">واحد</label>
                    <input type="text" className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-rose-500" value={markerData.unit} onChange={e => setMarkerData({...markerData, unit: e.target.value})} />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">مقدار فعلی</label>
                    <input type="number" step="0.1" className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-rose-500" value={markerData.current} onChange={e => setMarkerData({...markerData, current: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">مقدار قبلی (اختیاری)</label>
                    <input type="number" step="0.1" className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-rose-500" value={markerData.previous} onChange={e => setMarkerData({...markerData, previous: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">شرح حال (سابقه جراحی/شیمی درمانی)</label>
                 <textarea className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 h-24 resize-none" placeholder="مثال: بیمار ۳ ماه پیش پروستاتکتومی رادیکال انجام داده..." value={markerData.history} onChange={e => setMarkerData({...markerData, history: e.target.value})} />
               </div>
            </div>
          )}

          <button 
            onClick={handleAnalyze}
            disabled={loading || (activeTab !== 'markers' && !image)}
            className="w-full mt-6 bg-rose-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? 'در حال آنالیز سلولی/مولکولی...' : 'شروع آنالیز'}
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
                   
                   {/* Smear Cells */}
                   {result.cellTypes && (
                     <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                       <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                         <Activity size={18} />
                         شمارش و مورفولوژی سلولی
                       </h4>
                       <div className="grid gap-2">
                         {result.cellTypes.map((c, i) => (
                           <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                              <span className="font-bold text-gray-800">{c.name}</span>
                              <div className="text-right">
                                <span className="block text-sm font-mono">{c.count}</span>
                                <span className="text-xs text-gray-500">{c.status}</span>
                              </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Marker Trend */}
                   {result.markersTrend && (
                      <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                         <h4 className="font-bold text-rose-800 mb-2 flex items-center gap-2">
                           <TrendingUp size={18} />
                           تحلیل روند مارکر
                         </h4>
                         {result.markersTrend.map((m, i) => (
                           <div key={i} className="space-y-2">
                              <div className="flex justify-between font-bold text-rose-900">
                                <span>{m.name}</span>
                                <span>{m.trend}</span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">{m.significance}</p>
                           </div>
                         ))}
                      </div>
                   )}

                   <div>
                      <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">یافته‌های بالینی</h4>
                      <ul className="space-y-2">
                        {result.findings.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {f}
                          </li>
                        ))}
                      </ul>
                   </div>

                   <div className="bg-blue-50 p-4 rounded-xl">
                      <h4 className="font-bold text-blue-800 mb-2">توصیه‌های انکولوژی</h4>
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
                <Droplet size={48} className="mb-4" />
                <p>منتظر داده‌ها برای آنالیز خون و سرطان...</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Hematology;
