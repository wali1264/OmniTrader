
import React, { useState } from 'react';
import { analyzeGenetics } from '../services/geminiService';
import { GeneticsAnalysis } from '../types';
import { Dna, FileText, Pill, Users, AlertCircle, CheckCircle, Upload, Activity } from 'lucide-react';

type Tab = 'report' | 'pharma' | 'family';

const Genetics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('report');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneticsAnalysis | null>(null);

  // Report State (Image)
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Pharma Data
  const [pharmaData, setPharmaData] = useState({
    drug: '',
    profile: ''
  });

  // Family History Text
  const [familyText, setFamilyText] = useState('');

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      let res;
      if (activeTab === 'report') {
         if (!image) return;
         res = await analyzeGenetics(image, 'report');
      } else if (activeTab === 'pharma') {
         if (!pharmaData.drug) return;
         res = await analyzeGenetics(pharmaData, 'pharma');
      } else {
         if (!familyText.trim()) return;
         res = await analyzeGenetics(familyText, 'family');
      }
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('خطا در آنالیز ژنتیکی');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Dna className="text-violet-600 w-10 h-10" />
        <div>
          <h2 className="text-3xl font-bold text-gray-800">دپارتمان ژنتیک و پزشکی دقیق</h2>
          <p className="text-gray-500">Genetics & Precision Medicine</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl p-2 shadow-sm border border-gray-100 max-w-3xl">
        <button
          onClick={() => { setActiveTab('report'); setResult(null); setImage(null); setPreview(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'report' ? 'bg-violet-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <FileText /> مفسر گزارش ژنتیک
        </button>
        <button
          onClick={() => { setActiveTab('pharma'); setResult(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'pharma' ? 'bg-violet-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Pill /> فارماکوژنتیک
        </button>
        <button
          onClick={() => { setActiveTab('family'); setResult(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'family' ? 'bg-violet-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Users /> شجره‌نامه ریسک
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 h-fit">
          
          {activeTab === 'report' && (
            <div className="space-y-6">
              <h3 className="font-bold text-gray-800">آپلود گزارش آزمایش ژنتیک</h3>
              <p className="text-sm text-gray-500">
                 تصویر کاریوتایپ، گزارش NGS یا نتایج آزمایشاتی مثل 23andMe را آپلود کنید تا جهش‌ها تفسیر شوند.
              </p>
              
              <div className="border-2 border-dashed border-violet-200 bg-violet-50/30 rounded-2xl h-80 flex flex-col items-center justify-center relative overflow-hidden group">
                 <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImage} />
                 {preview ? (
                   <img src={preview} className="w-full h-full object-contain" alt="Report" />
                 ) : (
                   <div className="text-center p-4">
                     <FileText className="mx-auto text-violet-400 w-12 h-12 mb-3" />
                     <p className="text-gray-600 font-medium">تصویر گزارش را اینجا رها کنید</p>
                   </div>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'pharma' && (
            <div className="space-y-4">
               <h3 className="font-bold text-gray-800 mb-4">بررسی سازگاری دارو و ژن (Drug-Gene Match)</h3>
               <p className="text-sm text-gray-500 mb-4">
                  بررسی کنید که آیا داروی تجویز شده با پروفایل ژنتیکی بیمار (متابولیزم کبدی) سازگار است یا خیر.
               </p>
               
               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">نام دارو</label>
                 <input 
                   type="text" 
                   className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-violet-500" 
                   placeholder="مثال: Warfarin, Clopidogrel, Sertraline..."
                   value={pharmaData.drug}
                   onChange={e => setPharmaData({...pharmaData, drug: e.target.value})}
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">پروفایل ژنتیکی (اختیاری)</label>
                 <textarea 
                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 h-24 resize-none" 
                    placeholder="مثال: CYP2C9 *2/*3, HLA-B*5701 Positive..."
                    value={pharmaData.profile}
                    onChange={e => setPharmaData({...pharmaData, profile: e.target.value})}
                 />
               </div>
            </div>
          )}

          {activeTab === 'family' && (
            <div className="space-y-6">
              <h3 className="font-bold text-gray-800">تحلیل شجره‌نامه و ریسک وراثتی</h3>
              <p className="text-sm text-gray-500">
                 سوابق بیماری در خانواده (پدر، مادر، اجداد) را با جزئیات بنویسید تا الگوی توارث بررسی شود.
              </p>
              
              <textarea 
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 h-64 resize-none leading-relaxed"
                placeholder="مثال: پدربزرگ پدری در ۵۰ سالگی سکته قلبی کرد. مادر دیابت نوع ۲ دارد. برادر کوچکترم تالاسمی مینور دارد..."
                value={familyText}
                onChange={e => setFamilyText(e.target.value)}
              />
            </div>
          )}

          <button 
            onClick={handleAnalyze}
            disabled={
                loading || 
                (activeTab === 'report' && !image) || 
                (activeTab === 'pharma' && !pharmaData.drug) ||
                (activeTab === 'family' && !familyText.trim())
            }
            className="w-full mt-6 bg-violet-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? 'در حال رمزگشایی DNA...' : 'شروع آنالیز دقیق'}
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
                     <h3 className="text-xl font-bold">نتیجه آنالیز ژنتیکی</h3>
                     <p className="text-white/80 text-sm mt-1">{result.diagnosis}</p>
                   </div>
                   {result.severity === 'critical' ? <AlertCircle size={32} /> : <CheckCircle size={32} />}
                </div>

                <div className="p-6 space-y-6">
                   
                   {/* Drug Compatibility Block */}
                   {result.drugCompatibility && (
                     <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                        result.drugCompatibility.status.includes('Safe') || result.drugCompatibility.status.includes('Normal') 
                        ? 'bg-green-50 border-green-100' 
                        : 'bg-red-50 border-red-100'
                     }`}>
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-800">{result.drugCompatibility.drug}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                result.drugCompatibility.status.includes('Safe') ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                            }`}>
                                {result.drugCompatibility.status}
                            </span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">{result.drugCompatibility.recommendation}</p>
                     </div>
                   )}

                   {/* Risks Block */}
                   {result.risks && result.risks.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                         <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                           <Activity size={18} />
                           تخمین ریسک وراثتی
                         </h4>
                         <div className="space-y-3">
                           {result.risks.map((r, i) => (
                             <div key={i} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                                <span className="font-medium text-gray-800">{r.condition}</span>
                                <span className="text-sm font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded">{r.probability}</span>
                             </div>
                           ))}
                         </div>
                      </div>
                   )}

                   <div>
                      <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">یافته‌های تفصیلی</h4>
                      <ul className="space-y-2">
                        {result.findings.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {f}
                          </li>
                        ))}
                      </ul>
                   </div>

                   <div className="bg-violet-50 p-4 rounded-xl">
                      <h4 className="font-bold text-violet-800 mb-2">توصیه‌ها و مشاوره</h4>
                      <ul className="space-y-1">
                        {result.recommendations.map((r, i) => (
                          <li key={i} className="text-sm text-violet-900">• {r}</li>
                        ))}
                      </ul>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-full bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 p-8 text-center opacity-70">
                <Dna size={48} className="mb-4" />
                <p>منتظر داده‌ها برای آنالیز DNA...</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Genetics;
