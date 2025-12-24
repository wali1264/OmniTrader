
import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { geminiService } from '../services/geminiService';
import { PlantCareInfo } from '../types';
import { PlantCard } from './PlantCard';

export const IdentifyView: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [result, setResult] = useState<PlantCareInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const identifyPlant = async () => {
    if (!image) return;
    
    setIsIdentifying(true);
    setError(null);
    try {
      const base64Data = image.split(',')[1];
      const data = await geminiService.identifyPlant(base64Data);
      setResult(data);
    } catch (err) {
      setError("I couldn't identify this plant. Please try a clearer photo.");
      console.error(err);
    } finally {
      setIsIdentifying(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {!image ? (
        <div className="w-full max-w-2xl text-center space-y-8 py-12">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div 
              className="relative bg-white border-2 border-dashed border-emerald-200 rounded-[3rem] p-12 md:p-20 flex flex-col items-center cursor-pointer hover:border-emerald-400 transition-colors bg-opacity-80 backdrop-blur-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 text-4xl group-hover:scale-110 transition-transform duration-300">
                📸
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Snap a Photo</h2>
              <p className="text-slate-500 mb-8 max-w-sm">
                Upload or take a photo of any plant to get instant care instructions and identification.
              </p>
              <Button>Select Image</Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
             {[
               { label: 'Identify', icon: '🔍' },
               { label: 'Detailed Care', icon: '📝' },
               { label: 'Pest Alerts', icon: '⚠️' }
             ].map((item, i) => (
               <div key={i} className="flex flex-col items-center gap-2">
                 <div className="text-2xl">{item.icon}</div>
                 <span className="text-xs font-semibold text-slate-400 uppercase tracking-tighter">{item.label}</span>
               </div>
             ))}
          </div>
        </div>
      ) : (
        <div className="w-full space-y-12">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-full max-w-xl h-96 rounded-[2.5rem] overflow-hidden shadow-2xl ring-8 ring-white">
              <img src={image} alt="Selected" className="w-full h-full object-cover" />
              {!result && !isIdentifying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                   <Button variant="secondary" onClick={reset}>Change Photo</Button>
                </div>
              )}
            </div>
            
            {!result && (
              <div className="flex gap-4">
                <Button onClick={identifyPlant} isLoading={isIdentifying} className="w-48">
                  {isIdentifying ? 'Analyzing...' : 'Analyze Plant'}
                </Button>
                <Button variant="ghost" onClick={reset} disabled={isIdentifying}>Cancel</Button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl border border-red-100 max-w-md mx-auto text-center font-medium animate-bounce">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-12 pb-20">
              <PlantCard data={result} imageUrl={image} />
              <div className="flex justify-center">
                <Button variant="outline" onClick={reset}>Identify Another Plant</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
