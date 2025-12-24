
import React from 'react';
import { PlantCareInfo } from '../types';

interface PlantCardProps {
  data: PlantCareInfo;
  imageUrl?: string;
}

export const PlantCard: React.FC<PlantCardProps> = ({ data, imageUrl }) => {
  const StatItem = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
    <div className="flex items-start gap-3 p-4 bg-white rounded-2xl shadow-sm border border-emerald-50">
      <div className="text-2xl">{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-700 font-medium">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-emerald-100">
        <div className="md:flex">
          {imageUrl && (
            <div className="md:w-1/3 h-64 md:h-auto overflow-hidden">
              <img src={imageUrl} alt={data.plantName} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="md:flex-1 p-8 md:p-12">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-4xl font-serif text-slate-900 mb-1">{data.plantName}</h2>
                <p className="text-lg italic text-emerald-600 font-medium">{data.scientificName}</p>
              </div>
              <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                data.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                data.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
              }`}>
                {data.difficulty}
              </span>
            </div>

            <p className="text-slate-600 leading-relaxed mb-8">{data.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              <StatItem label="Watering" value={data.watering} icon="💧" />
              <StatItem label="Sunlight" value={data.sunlight} icon="☀️" />
              <StatItem label="Soil" value={data.soil} icon="🪴" />
              <StatItem label="Common Pests" value={data.pests.join(', ')} icon="🐛" />
            </div>

            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <h4 className="text-emerald-900 font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">✨</span> Pro Tips
              </h4>
              <ul className="space-y-3">
                {data.tips.map((tip, idx) => (
                  <li key={idx} className="flex gap-3 text-emerald-800 text-sm">
                    <span className="text-emerald-400 font-bold">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
