
import React, { useState } from 'react';
import { Quote } from './types';
import { CalculatorSection } from './components/CalculatorSection';
import { ServiceForm } from './components/ServiceForm';
import { AIAdvisor } from './components/AIAdvisor';
import { Settings, LogOut, LayoutDashboard, History, Menu, X as CloseIcon } from 'lucide-react';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quote, setQuote] = useState<Quote>({
    id: '1',
    customerName: 'Guest Customer',
    items: [],
    discount: 0,
    splitCount: 1,
    taxRate: 8.5
  });

  const handleItemsChange = (newItems: Quote['items']) => {
    setQuote({ ...quote, items: newItems });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg italic shadow-lg shadow-blue-500/20">AM</div>
            <h1 className="font-black text-xl tracking-tight">AutoMath<span className="text-blue-500">PRO</span></h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 hover:bg-slate-800 rounded-lg">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2 mt-4">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 rounded-xl font-semibold transition-all">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl font-semibold transition-all">
            <History className="w-5 h-5" /> Recent Quotes
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl font-semibold transition-all">
            <Settings className="w-5 h-5" /> Garage Settings
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
           <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto max-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-bold text-slate-800">Quote Draft #9402</h2>
              <p className="text-xs text-slate-500">Last updated: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Active Session</span>
            </div>
            <img src="https://picsum.photos/40/40?grayscale" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="User" />
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="p-4 sm:p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
          
          {/* Left Column: Form & Items */}
          <div className="lg:col-span-8 space-y-8">
            <section>
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create Service Estimate</h2>
                   <p className="text-slate-500">Add labor, parts, and apply math logic for accurate billing.</p>
                </div>
                <div className="flex gap-2">
                   <button className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50">Draft Save</button>
                   <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-800">Preview Invoice</button>
                </div>
              </div>
              <ServiceForm items={quote.items} onItemsChange={handleItemsChange} />
            </section>

            <section>
              <AIAdvisor />
            </section>
          </div>

          {/* Right Column: Calculator Engine */}
          <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-24">
              <CalculatorSection quote={quote} onUpdateQuote={setQuote} />
              
              {/* Quick Summary Cards */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Items</p>
                    <p className="text-2xl font-black text-slate-900">{quote.items.length}</p>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Labor Hrs</p>
                    <p className="text-2xl font-black text-slate-900">
                      {quote.items.filter(i => i.type === 'labor').reduce((acc, curr) => acc + curr.quantity, 0)}
                    </p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
