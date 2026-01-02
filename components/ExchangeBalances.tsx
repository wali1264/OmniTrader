
import React, { useMemo, useState } from 'react';
import { 
  ArrowRightLeft, TrendingUp, Clock, 
  ChevronRight, ChevronLeft, Target, Activity, ShieldCheck, Coins, Sparkles,
  BarChart3, PieChart, TrendingDown, DollarSign, Info
} from 'lucide-react';
import { Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, GlobalRate } from '../types';

interface ExchangeBalancesProps {
  transactions: Transaction[];
  globalRates: GlobalRate[];
}

const ExchangeBalances: React.FC<ExchangeBalancesProps> = ({ transactions, globalRates }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const changeDay = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  const dailyStats = useMemo(() => {
    const todayTrans = transactions.filter(t => 
      t.status === TransactionStatus.APPROVED && 
      isSameDay(new Date(t.timestamp), selectedDate)
    );

    let totalExchangeProfit = 0;
    const stats: Record<string, { buy: number, sell: number, net: number, profit: number }> = {};

    SUPPORTED_CURRENCIES.forEach(curr => {
      const exchangeTrans = todayTrans.filter(t => t.type === TransactionType.EXCHANGE && t.currency === curr.code);
      
      const buyVal = todayTrans
        .filter(t => (t.type === TransactionType.RESID && t.currency === curr.code) || (t.type === TransactionType.EXCHANGE && t.currency === curr.code))
        .reduce((sum, t) => sum + t.amount, 0);

      const sellVal = todayTrans
        .filter(t => (t.type === TransactionType.BOARD && t.currency === curr.code) || (t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code))
        .reduce((sum, t) => sum + (t.type === TransactionType.EXCHANGE ? (t.convertedAmount || 0) : t.amount), 0);
      
      // محاسبه سود بر اساس اختلاف نرخ واقعی بازار و نرخ خرید صرافی
      const profit = exchangeTrans.reduce((sum, t) => sum + (t.netProfit || 0), 0);

      totalExchangeProfit += profit;

      stats[curr.code] = {
        buy: buyVal,
        sell: sellVal,
        net: buyVal - sellVal,
        profit: profit
      };
    });

    return { stats, totalExchangeProfit, approvedCount: todayTrans.length };
  }, [transactions, selectedDate]);

  const persianDate = selectedDate.toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <button onClick={() => changeDay(1)} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 rounded-2xl transition-all"><ChevronRight size={24} /></button>
              <div>
                 <h3 className="text-xl font-black text-slate-900">{persianDate}</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase mt-1">تراز تبادلات و آنالیز سود</p>
              </div>
              <button onClick={() => changeDay(-1)} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 rounded-2xl transition-all"><ChevronLeft size={24} /></button>
           </div>
        </div>

        <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center gap-12 shadow-2xl overflow-hidden relative">
           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><TrendingUp size={80} /></div>
           <div className="relative z-10 border-l border-white/10 pl-10 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-emerald-400" />
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">سود خالص عملیاتی (AFN)</p>
              </div>
              <h4 className="text-4xl font-black text-emerald-400">{dailyStats.totalExchangeProfit.toLocaleString()}</h4>
           </div>
           <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">اسناد نهایی شده</p>
              <p className="text-xl font-black">{dailyStats.approvedCount} سند</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
           <h3 className="text-xl font-black text-slate-900">توازن گردش ارز و سود خالص (Spread Analysis)</h3>
           <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><BarChart3 size={24} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100">
                <th className="py-6 px-10 font-black text-[10px] uppercase">واحد ارز</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase">مجموع خرید (Buy Vol)</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase">مجموع فروش (Sell Vol)</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase text-emerald-600">سود حاصله (AFN)</th>
                <th className="py-6 px-10 font-black text-[10px] uppercase text-left">وضعیت عملکرد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {SUPPORTED_CURRENCIES.map(curr => {
                const s = dailyStats.stats[curr.code];
                return (
                  <tr key={curr.code} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-8 px-10 font-black text-slate-800">{curr.label}</td>
                    <td className="py-8 px-4 font-black">{s.buy.toLocaleString()}</td>
                    <td className="py-8 px-4 font-black">{s.sell.toLocaleString()}</td>
                    <td className="py-8 px-4 font-black text-emerald-600">{s.profit.toLocaleString()}</td>
                    <td className="py-8 px-10 text-left">
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${s.profit > 0 ? 'bg-emerald-50 text-emerald-600' : s.profit < 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                         {s.profit > 0 ? 'سودده' : s.profit < 0 ? 'ضررده' : 'بدون فعالیت'}
                       </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100 flex items-start gap-6">
         <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg"><Info size={24} /></div>
         <div>
            <h4 className="font-black text-blue-900 mb-1">راهنمای نرخ‌گذاری و سود</h4>
            <p className="text-xs text-blue-700/80 leading-relaxed font-medium">
              در هر تبادله، نرخ خرید (Buy Rate) نرخی است که شما با مشتری توافق کرده‌اید و مستقیماً روی بالانس حساب او تاثیر می‌گذارد. نرخ فروش (Sell Rate) ارزش واقعی آن ارز در مارکت صرافی شماست. اختلاف این دو نرخ ضربدر مقدار ارز، منهای کارمزدهای پرداختی، تشکیل‌دهنده سود خالص شماست.
            </p>
         </div>
      </div>
    </div>
  );
};

export default ExchangeBalances;
