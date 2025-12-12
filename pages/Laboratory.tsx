
import React, { useState } from 'react';
import { analyzeCulture } from '../services/geminiService';
import { LabAnalysis } from '../types';
import { Upload, Microscope, CheckCircle, AlertTriangle } from 'lucide-react';

const Laboratory: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [labType, setLabType] = useState('Blood Agar');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LabAnalysis | null>(null);

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
      const res = await analyzeCulture(image, labType, notes);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('خطا در آنالیز تصویر');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Input Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-fit">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Microscope className="text-indigo-600" />
          <span>میز کار میکروبیولوژی</span>
        </h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">نوع محیط کشت / آزمایش</label>
            <select 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500"
              value={labType}
              onChange={(e) => setLabType(e.target.value)}
            >
              <option value="Blood Agar">Blood Agar (کشت خون/عمومی)</option>
              <option value="MacConkey Agar">MacConkey Agar (ادرار/گوارشی)</option>
              <option value="Chocolate Agar">Chocolate Agar (خلط/هموفیلوس)</option>
              <option value="Antibiogram (Disk Diffusion)">Antibiogram (تست حساسیت آنتی‌بیوتیک)</option>
              <option value="Microscope Slide">اسلاید میکروسکوپی (گرم استین)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">یادداشت‌های تکنسین</label>
            <textarea 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 h-24 resize-none"
              placeholder="مشاهدات اولیه، بوی خاص، منبع نمونه..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div 
            className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-2xl h-64 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
          >
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImage} />
            {preview ? (
              <img src={preview} alt="Culture Plate" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                 <div className="w-16 h-16 bg-white text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                   <Upload size={28} />
                 </div>
                 <p className="font-bold text-indigo-900">آپلود عکس پلیت</p>
                 <p className="text-xs text-indigo-600 mt-1">عکس با کیفیت از محیط کشت</p>
              </div>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!image || loading}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            {loading ? 'در حال پردازش هوشمند...' : 'آنالیز نمونه'}
          </button>
        </div>
      </div>

      {/* Result Section */}
      <div className="space-y-6">
        {result ? (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden animate-fade-in border border-gray-200">
             <div className={`p-6 text-white flex justify-between items-center ${result.severity === 'high' ? 'bg-red-600' : result.severity === 'medium' ? 'bg-orange-500' : 'bg-green-600'}`}>
                <h3 className="text-xl font-bold">نتیجه آنالیز هوشمند</h3>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                  {result.severity === 'high' ? 'خطرناک' : result.severity === 'medium' ? 'نیازمند توجه' : 'عادی'}
                </span>
             </div>
             
             <div className="p-8 space-y-8">
                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">تشخیص ارگانیسم</label>
                   <p className="text-3xl font-bold text-gray-800 mt-1">{result.suspectedOrganism}</p>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                   <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                     <Microscope size={20} />
                     مشاهدات تصویری
                   </h4>
                   <p className="text-gray-600 leading-relaxed">{result.visualFindings}</p>
                </div>

                <div>
                   <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                     <CheckCircle size={20} className="text-green-600" />
                     پیشنهادات آزمایشگاه
                   </h4>
                   <div className="grid gap-3">
                     {result.recommendations.map((rec, i) => (
                       <div key={i} className="flex items-center gap-3 p-3 bg-indigo-50 text-indigo-900 rounded-lg">
                         <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                         {rec}
                       </div>
                     ))}
                   </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center text-gray-400 p-10 text-center">
            <Microscope size={64} className="mb-4 opacity-50" />
            <p>منتظر دریافت تصویر نمونه برای آنالیز میکروبیولوژی...</p>
            <p className="text-sm mt-2">تشخیص کلونی‌ها، همولیز و پیشنهاد آنتی‌بیوتیک</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Laboratory;
