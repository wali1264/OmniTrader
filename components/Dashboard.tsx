
import React, { useState, useMemo } from 'react';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft, Landmark, DollarSign, Coins, Building2, Plus, Sparkles, Loader2, RefreshCw, ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction, GlobalRate, SUPPORTED_CURRENCIES, TransactionType, TransactionStatus, BankAccount } from '../types';
import { GoogleGenAI } from "@google/genai";

interface DashboardProps {
  stats: {
    cashBox: Record<string, number>;
    totalProfit: number;
  };
  transactions: Transaction[];
  globalRates: GlobalRate[];
  setGlobalRates: React.Dispatch<React.SetStateAction<GlobalRate[]>>;
  bankAccounts: BankAccount[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, transactions, globalRates, setGlobalRates, bankAccounts }) => {
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [groundingSources, setGroundingSources] = useState<{title?: string, uri?: string}[]>([]);

  const fetchLatestRates = async () => {
    setIsFetchingRates(true);
    setGroundingSources([]);
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
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const sources = chunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            title: chunk.web.title,
            uri: chunk.web.uri
          }));
        setGroundingSources(sources);
      }
      
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

  const bankAccountBalances = useMemo(() => {
    return bankAccounts.map(account => {
      const approved = transactions.filter(t => t.bankAccountId === account.id && t.status === TransactionStatus.APPROVED);
      const resid = approved.filter(t => t.type === TransactionType.RESID).reduce((sum, t) => sum + t.amount, 0);
      const board = approved.filter(t => t.type === TransactionType.BOARD).reduce((sum, t) => sum + t.amount, 0);
      return {
        ...account,
        currentBalance: account.balance + resid - board
      };
    });
  }, [bankAccounts, transactions]);

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
    <div className="space-y-10 animate-in fade-in duration-700 w-full">
      
      {/* Main Stats with English Currency Labels */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="lg:col-span-1 bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
             <RefreshCw size={120} />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-200 animate-pulse" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-100">Market Rate (USD/AFN)</h3>
              </div>
              <div className="flex items-baseline gap-2 tabular-nums">
                <h4 className="text-3xl font-black">
                  {globalRates.find(r => r.currencyCode === 'USD')?.rateToAfn || '70.5'}
                </h4>
                <span className="text-sm font-bold opacity-70">؋</span>
              </div>
              {groundingSources.length > 0 && (
                <div className="mt-4 space-y-1">
                  <p className="text-[8px] font-bold opacity-60">Web Sources:</p>
                  {groundingSources.map((source, i) => (
                    <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[8px] hover:underline opacity-80">
                      <ExternalLink size={8} /> {source.title?.slice(0, 20)}...
                    </a>
                  ))}
                </div>
              )}
            </div>
            <button onClick={fetchLatestRates} disabled={isFetchingRates} className="mt-6 w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all">
              {isFetchingRates ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Refresh Rate
            </button>
          </div>
        </div>

        <StatCard title="AFN Balance" value={(stats.cashBox['AFN'] || 0).toLocaleString()} unit="AFN" icon={<Coins className="text-blue-500" />} />
        <StatCard title="USD Balance" value={(stats.cashBox['USD'] || 0).toLocaleString()} unit="USD" icon={<DollarSign className="text-emerald-500" />} />
        <StatCard title="IRT Cash" value={(stats.cashBox['IRT_CASH'] || 0).toLocaleString()} unit="IRT" icon={<Coins className="text-orange-500" />} />
        <StatCard title="PKR Balance" value={(stats.cashBox['PKR'] || 0).toLocaleString()} unit="PKR" icon={<Coins className="text-purple-500" />} />
        <StatCard title="Net Profit" value={stats.totalProfit.toLocaleString()} unit="AFN" icon={<TrendingUp className="text-indigo-500" />} highlight />
      </section>

      {/* Bank Account Summary */}
      <section className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8 px-2">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Landmark size={24} /></div>
              <h3 className="text-2xl font-black text-slate-900">حسابات بانکی جاری</h3>
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {bankAccountBalances.map(account => (
            <div key={account.id} className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="flex justify-between items-start mb-6">
                 <p className="text-base font-black text-slate-800">{account.bankName}</p>
                 <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">{account.currency}</span>
              </div>
              <p className="text-2xl font-black text-slate-900 tabular-nums">{account.currentBalance.toLocaleString()}</p>
              <p className="text-[10px] font-mono text-slate-400 mt-4 tracking-widest">{account.accountNumber}</p>
            </div>
          ))}
          {bankAccountBalances.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 italic text-sm">هیچ حساب بانکی تعریف نشده است.</div>
          )}
        </div>
      </section>

      {/* Today's Stats with English Currency Labels */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 text-right">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-slate-900">ورودی‌های امروز (رسید)</h3>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><ArrowDownLeft size={28} /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            {SUPPORTED_CURRENCIES.map(curr => (
              <div key={curr.code} className="p-6 rounded-3xl bg-emerald-50/30 border border-emerald-50">
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-2 tracking-widest">{curr.code}</p>
                <span className="text-lg font-black text-slate-800 tabular-nums">{dailyStats.incoming[curr.code]?.toLocaleString() || '0'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 text-right">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-slate-900">خروجی‌های امروز (برد)</h3>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><ArrowUpRight size={28} /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            {SUPPORTED_CURRENCIES.map(curr => (
              <div key={curr.code} className="p-6 rounded-3xl bg-rose-50/30 border border-rose-50">
                <p className="text-[10px] font-black text-rose-600 uppercase mb-2 tracking-widest">{curr.code}</p>
                <span className="text-lg font-black text-slate-800 tabular-nums">{dailyStats.outgoing[curr.code]?.toLocaleString() || '0'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-10 text-right">
          <h3 className="text-2xl font-black text-slate-900">گردش نقدینگی هفته اخیر</h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> <span className="text-[10px] font-black text-slate-400">ورودی</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div> <span className="text-[10px] font-black text-slate-400">خروجی</span></div>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#94a3b8'}} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)', padding: '20px'}} 
                itemStyle={{fontWeight: '900', fontSize: '14px'}}
              />
              <Area type="monotone" dataKey="resid" stroke="#10b981" strokeWidth={4} fillOpacity={0.05} fill="#10b981" />
              <Area type="monotone" dataKey="board" stroke="#f43f5e" strokeWidth={4} fillOpacity={0.05} fill="#f43f5e" />
            </AreaChart>
          </ResponsiveContainer>
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
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, unit, icon, highlight }) => (
  <div className={`p-10 rounded-[3rem] shadow-sm border transition-all text-right hover:shadow-2xl hover:-translate-y-1 ${highlight ? 'bg-slate-900 text-white border-slate-900 shadow-slate-200' : 'bg-white border-slate-100 shadow-slate-100'}`}>
    <div className={`p-4 rounded-[1.5rem] mb-6 inline-block ${highlight ? 'bg-white/10' : 'bg-slate-50'}`}>{icon}</div>
    <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-slate-400">{title}</p>
    <div className="flex items-baseline gap-2 justify-end tabular-nums">
      <h4 className="text-2xl font-black tracking-tight">{value}</h4>
      <span className={`text-[10px] font-black uppercase ${highlight ? 'text-blue-400' : 'text-slate-400'}`}>{unit}</span>
    </div>
  </div>
);

export default Dashboard;
