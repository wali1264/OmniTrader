
import React, { useState, useMemo } from 'react';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft, Landmark, DollarSign, Coins, Building2, Plus, Sparkles, Loader2, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction, BankAccount, GlobalRate, SUPPORTED_CURRENCIES, TransactionType, TransactionStatus } from '../types';
import { GoogleGenAI } from "@google/genai";

interface DashboardProps {
  stats: {
    cashBox: Record<string, number>;
    bankSums: Record<string, number>;
    totalProfit: number;
  };
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  globalRates: GlobalRate[];
  setGlobalRates: React.Dispatch<React.SetStateAction<GlobalRate[]>>;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, bankAccounts, transactions, globalRates, setGlobalRates }) => {
  const [isFetchingRates, setIsFetchingRates] = useState(false);

  // Fix: Property names to match GlobalRate definition in types.ts (currencyCode/rateToAfn)
  const fetchLatestRates = async () => {
    setIsFetchingRates(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: "Get the current market exchange rate for 1 USD to Afghan Afghani (AFN). Return only the number.",
        config: {
          tools: [{ googleSearch: {} }]
        },
      });
      
      const rateText = response.text || "70.5";
      const numericRate = parseFloat(rateText.replace(/[^0-9.]/g, ''));
      
      if (!isNaN(numericRate)) {
        setGlobalRates(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(r => r.currencyCode === 'USD');
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], rateToAfn: numericRate, lastUpdated: Date.now(), source: 'AI/Google Search' };
          } else {
            updated.push({ currencyCode: 'USD', rateToAfn: numericRate, lastUpdated: Date.now(), source: 'AI/Google Search' });
          }
          return updated;
        });
      }
    } catch (err) {
      console.error("Rate fetch error:", err);
      alert("خطا در دریافت نرخ لحظه‌ای. نرخ دستی را از تنظیمات چک کنید.");
    } finally {
      setIsFetchingRates(false);
    }
  };

  const dailyStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const approvedToday = transactions.filter(t => 
      t.status === TransactionStatus.APPROVED && 
      new Date(t.timestamp).setHours(0, 0, 0, 0) === today.getTime()
    );

    const incoming: Record<string, number> = {};
    const outgoing: Record<string, number> = {};

    SUPPORTED_CURRENCIES.forEach(curr => {
      incoming[curr.code] = approvedToday
        .filter(t => t.type === TransactionType.RESID && t.currency === curr.code)
        .reduce((sum, t) => sum + t.amount, 0);
      
      outgoing[curr.code] = approvedToday
        .filter(t => t.type === TransactionType.BOARD && t.currency === curr.code)
        .reduce((sum, t) => sum + t.amount, 0);
    });

    return { incoming, outgoing };
  }, [transactions]);

  const chartData = [
    { name: 'شنبه', resid: 4000, board: 2400 },
    { name: 'یکشنبه', resid: 3000, board: 1398 },
    { name: 'دوشنبه', resid: 2000, board: 9800 },
    { name: 'سه‌شنبه', resid: 2780, board: 3908 },
    { name: 'چهارشنبه', resid: 1890, board: 4800 },
    { name: 'پنج‌شنبه', resid: 2390, board: 3800 },
    { name: 'جمعه', resid: 3490, board: 4300 },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* 1. Market Rates & Overall Cash Stats */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
             <RefreshCw size={120} />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-200 animate-pulse" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-100">نرخ مرجع بازار (USD/AFN)</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <h4 className="text-4xl font-black">
                  {/* Fix: Use currencyCode and rateToAfn from GlobalRate type */}
                  {globalRates.find(r => r.currencyCode === 'USD')?.rateToAfn || '70.5'}
                </h4>
                <span className="text-sm font-bold opacity-70">؋</span>
              </div>
            </div>
            <button 
              onClick={fetchLatestRates}
              disabled={isFetchingRates}
              className="mt-6 w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isFetchingRates ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              بروزرسانی هوشمند نرخ
            </button>
          </div>
        </div>

        <StatCard title="موجودی افغانی (AFN)" value={(stats.cashBox['AFN'] || 0).toLocaleString()} unit="؋" icon={<Coins className="text-blue-500" />} />
        <StatCard title="موجودی دالر (USD)" value={(stats.cashBox['USD'] || 0).toLocaleString()} unit="$" icon={<DollarSign className="text-emerald-500" />} />
        <StatCard title="سود خالص کل" value={stats.totalProfit.toLocaleString()} unit="AFN" icon={<TrendingUp className="text-indigo-500" />} trend="+15%" highlight />
      </section>

      {/* 2. Daily Detailed Movements (Incoming & Outgoing by Currency) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Incoming Section */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900">مجموع ورودی امروز (رسید)</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium italic">تفکیک شده بر اساس واحد پول</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <ArrowDownLeft size={24} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {SUPPORTED_CURRENCIES.map(curr => (
              <div key={curr.code} className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100/50">
                <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">{curr.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-slate-800">{dailyStats.incoming[curr.code]?.toLocaleString() || '0'}</span>
                  <span className="text-[10px] font-bold text-slate-400">{curr.code}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outgoing Section */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900">مجموع خروجی امروز (برد)</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium italic">تفکیک شده بر اساس واحد پول</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <ArrowUpRight size={24} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {SUPPORTED_CURRENCIES.map(curr => (
              <div key={curr.code} className="p-4 rounded-2xl bg-rose-50/30 border border-rose-100/50">
                <p className="text-[9px] font-black text-rose-600 uppercase mb-1">{curr.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-slate-800">{dailyStats.outgoing[curr.code]?.toLocaleString() || '0'}</span>
                  <span className="text-[10px] font-bold text-slate-400">{curr.code}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Charts & Banks Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900">جریان نقدینگی هفته</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">تجزیه و تحلیل ورودی و خروجی صندوق</p>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorResid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBoard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="resid" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorResid)" />
                <Area type="monotone" dataKey="board" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorBoard)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900">حساب‌های بانکی</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">موجودی حواله و پوز</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Building2 size={24} />
            </div>
          </div>
          <div className="space-y-4">
            {bankAccounts.length === 0 ? (
              <div className="text-center py-10 text-slate-300 italic text-sm">حسابی تعریف نشده است.</div>
            ) : (
              bankAccounts.map(bank => (
                <div key={bank.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all cursor-pointer">
                  <div>
                    <p className="font-black text-slate-900 text-sm">{bank.bankName}</p>
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest mt-1">**** {bank.accountNumber.slice(-4)}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-blue-600 text-base">{bank.balance.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{bank.currency}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  trend?: string;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, unit, icon, trend, highlight }) => (
  <div className={`p-8 rounded-[2.5rem] shadow-sm border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${highlight ? 'bg-slate-900 text-white border-slate-900 shadow-slate-200' : 'bg-white border-slate-100 shadow-slate-100'}`}>
    <div className="flex justify-between items-start mb-6">
      <div className={`p-3 rounded-2xl ${highlight ? 'bg-white/10' : 'bg-slate-50'}`}>
        {icon}
      </div>
      {trend && (
        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">{title}</p>
    <div className="flex items-baseline gap-2">
      <h4 className="text-3xl font-black">{value}</h4>
      <span className={`text-xs font-black uppercase tracking-tight ${highlight ? 'text-blue-400' : 'text-slate-400'}`}>{unit}</span>
    </div>
  </div>
);

export default Dashboard;
