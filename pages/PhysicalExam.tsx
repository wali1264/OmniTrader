
import React, { useState } from 'react';
import { analyzePhysicalExam } from '../services/geminiService';
import { PhysicalExamAnalysis } from '../types';
import { Upload, Eye, Smile, AlertCircle, CheckCircle, Fingerprint, Search } from 'lucide-react';

type ExamType = 'skin' | 'tongue' | 'face';

const PhysicalExam: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [examType, setExamType] = useState<ExamType>('skin');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PhysicalExamAnalysis | null>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const res = await analyzePhysicalExam(image, examType);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('خطا در تحلیل تصویر');
    } finally {
      setLoading(false);
    }
  };

  const ExamModeCard = ({ type, icon: Icon, title, desc }: { type: ExamType, icon: any, title: string, desc: string }) => (
    <button
      onClick={() => {
        setExamType(type);
        setResult(null);
        setImage(null);
        setPreview(null);
      }}
      className={`p-6 rounded-2xl border transition-all duration-200 text-right flex items-start gap-4 ${
        examType === type 
          ? 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500' 
          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-blue-300'
      }`}
    >
      <div className={`p-3 rounded-xl ${examType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
        <Icon size={24} />
      </div>
      <div>
        <h3 className={`font-bold text-lg ${examType === type ? 'text-blue-900' : 'text-gray-800'}`}>{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{desc}</p>
      </div>
    </button>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
         <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Eye className="text-blue-600" />
            معاینه فیزیکی هوشمند (Digital Exam)
         </h2>
         <p className="text-gray-500">انتخاب نوع معاینه جهت آنالیز بینایی ماشین</p>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ExamModeCard 
          type="skin" 
          icon={Fingerprint} 
          title="متخصص پوست (Dermatology)" 
          desc="تشخیص ضایعات پوستی، اگزما، آکنه و خطرات ملانوما" 
        />
        <ExamModeCard 
          type="tongue" 
          icon={Smile} 
          title="زبان‌شناسی (Tongue)" 
          desc="تشخیص بیماری‌های داخلی و مزاج از روی رنگ و بار زبان" 
        />
        <ExamModeCard 
          type="face" 
          icon={Search} 
          title="چهره‌شناسی (Face)" 
          desc="تشخیص کم‌خونی، یرقان و مزاج‌شناسی از روی چهره" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Upload Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-fit">
           <h3 className="font-bold text-gray-800 mb-4">آپلود تصویر {examType === 'skin' ? 'پوست' : examType === 'tongue' ? 'زبان' : 'صورت'}</h3>
           
           <div className="border-2 border-dashed border-gray-300 rounded-2xl h-80 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-gray-50 transition-colors">
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImage} />
              {preview ? (
                <img src={preview} alt="Exam" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-4">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={28} />
                  </div>
                  <p className="font-medium text-gray-600">تصویر را اینجا رها کنید یا کلیک کنید</p>
                  <p className="text-xs text-gray-400 mt-2">عکس باید با نور کافی و واضح باشد</p>
                </div>
              )}
           </div>

           <button
             onClick={handleAnalyze}
             disabled={!image || loading}
             className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 hover:shadow-xl transition-all flex items-center justify-center gap-2"
           >
             {loading ? 'در حال پردازش تصویر...' : 'شروع آنالیز هوشمند'}
           </button>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
           {result ? (
             <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 animate-fade-in">
                <div className={`p-6 text-white flex justify-between items-center ${
                  result.severity === 'high' ? 'bg-red-500' : result.severity === 'medium' ? 'bg-orange-500' : 'bg-green-600'
                }`}>
                   <div>
                     <h3 className="text-xl font-bold">نتیجه معاینه</h3>
                     <p className="text-white/80 text-sm">{result.diagnosis}</p>
                   </div>
                   {result.severity === 'high' ? <AlertCircle size={32} /> : <CheckCircle size={32} />}
                </div>
                
                <div className="p-6 space-y-6">
                   {/* Traditional Analysis (Special for Tongue/Face) */}
                   {result.traditionalAnalysis && (
                     <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                          <Smile size={18} />
                          تحلیل طب سنتی (مزاج و ارگان‌ها)
                        </h4>
                        <p className="text-gray-800 leading-relaxed text-sm">{result.traditionalAnalysis}</p>
                     </div>
                   )}

                   <div>
                      <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">یافته‌های بالینی</h4>
                      <ul className="space-y-2">
                        {result.findings.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {f}
                          </li>
                        ))}
                      </ul>
                   </div>

                   <div>
                      <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">توصیه‌های پزشکی</h4>
                      <div className="grid gap-2">
                        {result.recommendations.map((r, i) => (
                          <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                            {r}
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-full bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 p-8 text-center opacity-70">
                <Eye size={48} className="mb-4" />
                <p>منتظر تصویر برای آنالیز...</p>
                <p className="text-xs mt-2">لطفا از یک عکس واضح استفاده کنید</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default PhysicalExam;
