
import React, { useState, useMemo } from 'react';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft, Landmark, DollarSign, Coins, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
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

  const fetchLatestRates = async () => {
    setIsFetchingRates(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: "Get the current market exchange rate for 1 USD to Afghan Afghani (AFN). Return only the number.",
        config: { tools: [{ googleSearch: {} }] },
      });
      
      const rateText = response.text || "70.5";
      const numericRate = parseFloat(rateText.replace(/[^0-9.]/g, ''));
      
      if (!isNaN(numericRate)) {
        setGlobalRates(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(r => r.currencyCode === 'USD');
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], rateToAfn: numericRate, lastUpdated: Date.now(), source: 'AI' };
          } else {
            updated.push({ currencyCode: 'USD', rateToAfn: numericRate, lastUpdated: Date.now(), source: 'AI' });
          }
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
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
      incoming[curr.code] = approvedToday.filter(t => t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      outgoing[curr.code] = approvedToday.filter(t => t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
    });
    return { incoming, outgoing };
  }, [transactions]);

  const bankAccountBalances = useMemo(() => {
    return bankAccounts.map(account => {
      const approved = transactions.filter(t => t.bankAccountId === account.id && t.status === TransactionStatus.APPROVED);
      const resid = approved.filter(t => t.type === TransactionType.RESID).reduce((sum, t) => sum + t.amount, 0);
      const board = approved.filter(t => t.type === TransactionType.BOARD).reduce((sum, t) => sum + t.amount, 0);
      return { ...account, currentBalance: account.balance + resid - board };
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
    <div className="space-y-6">
      {/* Stats Cards Row - Smaller Padding/Gap */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl shadow-md text-white relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-1 opacity-70">
              <Sparkles size={12} className="text-blue-200 animate-pulse" />
              <h3 className="text-[8px] font-black uppercase tracking-widest">USD/AFN Rate</h3>
            </div>
            <div className="flex items-baseline gap-1 tnum">
              <h4 className="text-xl font-black">{globalRates.find(r => r.currencyCode === 'USD')?.rateToAfn || '70.5'}</h4>
              <span className="text-[10px] opacity-60">؋</span>
            </div>
            <button onClick={fetchLatestRates} disabled={isFetchingRates} className="mt-3 w-full bg-white/10 hover:bg-white/20 border border-white/10 py-2 rounded-xl text-[9px] font-black flex items-center justify-center gap-1.5 transition-all">
              {isFetchingRates ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              بروزرسانی نرخ
            </button>
          </div>
        </div>

        <StatCard title="صندوق افغانی" value={(stats.cashBox['AFN'] || 0).toLocaleString()} unit="AFN" icon={<Coins size={14} className="text-blue-500" />} />
        <StatCard title="صندوق دالر" value={(stats.cashBox['USD'] || 0).toLocaleString()} unit="USD" icon={<DollarSign size={14} className="text-emerald-500" />} />
        <StatCard title="تومان نقدی" value={(stats.cashBox['IRT_CASH'] || 0).toLocaleString()} unit="IRT" icon={<Coins size={14} className="text-orange-500" />} />
        <StatCard title="کلدار نقد" value={(stats.cashBox['PKR'] || 0).toLocaleString()} unit="PKR" icon={<Coins size={14} className="text-purple-500" />} />
        <StatCard title="سود کل (خالص)" value={stats.totalProfit.toLocaleString()} unit="AFN" icon={<TrendingUp size={14} className="text-indigo-500" />} highlight />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Landmark size={18} /></div>
            <h3 className="text-sm font-black text-slate-900">حسابات بانکی جاری</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bankAccountBalances.map(account => (
              <div key={account.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center group hover:bg-white transition-all">
                <div>
                   <p className="text-[11px] font-black text-slate-800">{account.bankName}</p>
                   <p className="text-[9px] font-mono text-slate-400 mt-0.5">{account.accountNumber}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-slate-900 tnum">{account.currentBalance.toLocaleString()}</p>
                  <span className="text-[8px] font-black text-blue-600 uppercase">{account.currency}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
           <h3 className="text-[11px] font-black text-slate-900 flex items-center justify-between">
              تراکنش‌های امروز
              <span className="text-[8px] opacity-40">امروز - {chartData[6].name}</span>
           </h3>
           <div className="space-y-2">
              <div className="p-3 bg-emerald-50 rounded-xl flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <ArrowDownLeft size={14} className="text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-800">کل ورودی (USD)</span>
                 </div>
                 <span className="text-xs font-black tnum">{dailyStats.incoming['USD']?.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <ArrowUpRight size={14} className="text-rose-600" />
                    <span className="text-[10px] font-bold text-rose-800">کل خروجی (USD)</span>
                 </div>
                 <span className="text-xs font-black tnum">{dailyStats.outgoing['USD']?.toLocaleString()}</span>
              </div>
           </div>
        </section>
      </div>

      <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-black text-slate-900">گردش نقدینگی هفته</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span className="text-[9px] font-bold text-slate-400">ورودی</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div> <span className="text-[9px] font-bold text-slate-400">خروجی</span></div>
          </div>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px'}} 
                itemStyle={{fontWeight: '900', fontSize: '11px'}}
              />
              <Area type="monotone" dataKey="resid" stroke="#10b981" strokeWidth={3} fillOpacity={0.03} fill="#10b981" />
              <Area type="monotone" dataKey="board" stroke="#f43f5e" strokeWidth={3} fillOpacity={0.03} fill="#f43f5e" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ title, value, unit, icon, highlight }: any) => (
  <div className={`p-4 rounded-2xl border transition-all text-right ${highlight ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white border-slate-100 shadow-sm hover:border-blue-100'}`}>
    <div className={`p-2 rounded-lg mb-2 inline-block ${highlight ? 'bg-white/10' : 'bg-slate-50'}`}>{icon}</div>
    <p className="text-[8px] font-black uppercase tracking-widest mb-1 text-slate-400">{title}</p>
    <div className="flex items-baseline gap-1 justify-end tnum">
      <h4 className="text-sm font-black tracking-tight">{value}</h4>
      <span className={`text-[8px] font-black ${highlight ? 'text-blue-400' : 'text-slate-400'}`}>{unit}</span>
    </div>
  </div>
);

export default Dashboard;
