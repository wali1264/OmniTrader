
import React, { useState } from 'react';
import { IdentifyView } from './components/IdentifyView';
import { GardenBot } from './components/GardenBot';
import { AppView } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.IDENTIFY);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-100">
      {/* Decorative background blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-100 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-50 rounded-full blur-[100px] opacity-60"></div>
      </div>

      <nav className="sticky top-4 z-50 px-4 md:px-8">
        <div className="max-w-4xl mx-auto glass rounded-full px-4 py-2 flex items-center justify-between shadow-lg border border-white/40">
          <div className="flex items-center gap-2 pl-4">
            <span className="text-2xl">🌱</span>
            <span className="font-serif text-xl font-bold bg-gradient-to-r from-emerald-800 to-emerald-600 bg-clip-text text-transparent">
              GardenPro
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentView(AppView.IDENTIFY)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                currentView === AppView.IDENTIFY 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              Identify
            </button>
            <button 
              onClick={() => setCurrentView(AppView.CHAT)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                currentView === AppView.CHAT 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              Ask Botanist
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <header className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-5xl md:text-7xl font-serif text-slate-900 mb-6 leading-tight">
            {currentView === AppView.IDENTIFY ? (
              <>Grow your garden with <span className="text-emerald-600">confidence.</span></>
            ) : (
              <>Your personal botanical <span className="text-emerald-600">expert.</span></>
            )}
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            {currentView === AppView.IDENTIFY 
              ? "Discover the secrets of your plants. Identify species and get tailored care guides instantly."
              : "Ask questions about soil, pruning, pests, or landscaping. Get expert advice powered by Gemini."}
          </p>
        </header>

        <div className="relative">
          {currentView === AppView.IDENTIFY ? <IdentifyView /> : <GardenBot />}
        </div>
      </main>

      <footer className="py-12 px-6 border-t border-slate-200 mt-20 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-xl">🌿</span>
          <span className="font-serif font-bold text-slate-800">GardenPro AI</span>
        </div>
        <p className="text-slate-400 text-sm">Powered by Gemini-3-Pro-Preview • Precision Plant Intelligence</p>
      </footer>
    </div>
  );
};

export default App;
