
import React, { useState } from 'react';
import { analyzeRadiology } from '../services/geminiService';
import { RadiologyAnalysis } from '../types';
import { Upload, ScanEye, AlertOctagon, CheckCircle2, FileText, Activity } from 'lucide-react';

const Radiology: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [modality, setModality] = useState('X-Ray');
  const [region, setRegion] = useState('Chest');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RadiologyAnalysis | null>(null);

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
      const res = await analyzeRadiology(image, modality, region);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('خطا در تحلیل تصویر رادیولوژی');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      {/* Controls & Viewport Section */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <ScanEye className="text-blue-600" />
            <span>رادیولوژی هوشمند</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">نوع تصویربرداری (Modality)</label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={modality}
                  onChange={(e) => setModality(e.target.value)}
                >
                  <option value="X-Ray">رادیوگرافی (X-Ray)</option>
                  <option value="CT Scan">سی‌تی اسکن (CT Scan)</option>
                  <option value="MRI">ام‌آرآی (MRI)</option>
                  <option value="Ultrasound">سونوگرافی (Ultrasound)</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">ناحیه بدن (Region)</label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="Chest">قفسه سینه (Chest)</option>
                  <option value="Brain">مغز و اعصاب (Brain)</option>
                  <option value="Abdomen">شکم و لگن (Abdomen)</option>
                  <option value="Spine">ستون فقرات (Spine)</option>
                  <option value="Extremity">اندام‌ها (دست/پا)</option>
                </select>
             </div>
          </div>

          <div className="relative group">
            <div className={`border-2 border-dashed rounded-2xl h-[500px] flex items-center justify-center relative overflow-hidden transition-all ${loading ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-black'}`}>
                {/* Scan Animation Overlay */}
                {loading && (
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent animate-scan z-20 pointer-events-none"></div>
                )}
                
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-30" onChange={handleImage} disabled={loading} />
                
                {preview ? (
                  <img src={preview} alt="Radiology Scan" className="w-full h-full object-contain z-10" />
                ) : (
                  <div className="text-center p-4 z-10">
                     <div className="w-20 h-20 bg-gray-800 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                       <Upload size={32} />
                     </div>
                     <p className="font-bold text-gray-300 text-lg">آپلود تصویر رادیولوژی</p>
                     <p className="text-sm text-gray-500 mt-2">DICOM, JPEG, PNG Supported</p>
                  </div>
                )}
            </div>
          </div>
          
          <div className="mt-6">
            <button
                onClick={handleAnalyze}
                disabled={!image || loading}
                className="w-full bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 disabled:opacity-50 hover:bg-blue-800 transition-colors flex items-center justify-center gap-3"
            >
                {loading ? (
                    <>
                        <Activity className="animate-pulse" />
                        <span>در حال پردازش پیکسل به پیکسل...</span>
                    </>
                ) : (
                    <>
                        <ScanEye />
                        <span>شروع آنالیز تخصصی</span>
                    </>
                )}
            </button>
          </div>
        </div>
      </div>

      {/* Report Section */}
      <div className="lg:col-span-4 h-full">
        {result ? (
           <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 h-full flex flex-col animate-fade-in">
              {/* Header */}
              <div className={`p-6 text-white ${
                  result.severity === 'critical' ? 'bg-red-600' : 
                  result.severity === 'abnormal' ? 'bg-orange-500' : 'bg-green-600'
              }`}>
                 <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold">گزارش رادیولوژی</h3>
                        <p className="text-white/80 text-sm mt-1">{result.modality} - {result.region}</p>
                    </div>
                    {result.severity === 'critical' ? <AlertOctagon size={32} /> : <CheckCircle2 size={32} />}
                 </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                 <div>
                    <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                        <FileText size={18} className="text-blue-600" />
                        تشخیص نهایی (Impression)
                    </h4>
                    <p className="text-gray-800 text-lg font-medium leading-relaxed bg-blue-50 p-4 rounded-xl border border-blue-100">
                        {result.impression}
                    </p>
                 </div>

                 {result.anatomicalLocation && (
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase">محل ضایعه</span>
                        <p className="text-gray-700 mt-1">{result.anatomicalLocation}</p>
                    </div>
                 )}

                 <div>
                    <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">یافته‌های دقیق (Findings)</h4>
                    <ul className="space-y-3">
                        {result.findings.map((f, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                {f}
                            </li>
                        ))}
                    </ul>
                 </div>
              </div>
              
              <div className="p-4 bg-gray-50 text-xs text-gray-400 text-center border-t border-gray-100">
                 Generated by Smart Radiology AI
              </div>
           </div>
        ) : (
            <div className="h-full bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 p-8 text-center opacity-70">
                <ScanEye size={48} className="mb-4" />
                <p>منتظر تصویر برای تولید گزارش...</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Radiology;
