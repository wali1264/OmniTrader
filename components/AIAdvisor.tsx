
import React, { useState } from 'react';
import { getCarServiceAdvice } from '../services/geminiService';
import { Sparkles, Car, AlertCircle, Loader2 } from 'lucide-react';

export const AIAdvisor: React.FC = () => {
  const [carInfo, setCarInfo] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAskAI = async () => {
    if (!carInfo || !symptoms) return;
    setIsLoading(true);
    const result = await getCarServiceAdvice(carInfo, symptoms);
    setAdvice(result);
    setIsLoading(false);
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-bold uppercase tracking-widest text-blue-400">AI Service Advisor</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
            <Car className="w-3 h-3" /> Vehicle Model & Year
          </label>
          <input 
            type="text" 
            placeholder="e.g. 2022 Toyota RAV4" 
            value={carInfo}
            onChange={(e) => setCarInfo(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
            <AlertCircle className="w-3 h-3" /> Describe Symptoms
          </label>
          <textarea 
            rows={3}
            placeholder="e.g. Squeaking brakes and a check engine light on..." 
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
          />
        </div>

        <button 
          onClick={handleAskAI}
          disabled={isLoading || !carInfo || !symptoms}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isLoading ? 'Consulting Experts...' : 'Generate AI Estimate'}
        </button>

        {advice && (
          <div className="mt-6 p-4 bg-slate-800 border-l-4 border-blue-500 rounded-r-xl animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
               {advice}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
