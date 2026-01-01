
import React, { useMemo, useState } from 'react';
import { 
  ArrowRightLeft, TrendingUp, Clock, 
  ChevronRight, ChevronLeft, Target, Activity, ShieldCheck, Coins, Sparkles,
  BarChart3, PieChart, TrendingDown, DollarSign
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

  const dailyExchangeStats = useMemo(() => {
    const todayTrans = transactions.filter(t => 
      t.status === TransactionStatus.APPROVED && 
      isSameDay(new Date(t.timestamp), selectedDate)
    );

    const stats: Record<string, { buy: number, sell: number, net: number, profit: number }> = {};

    SUPPORTED_CURRENCIES.forEach(curr => {
      const buyFromCustomer = todayTrans.filter(t => 
        (t.type === TransactionType.RESID && t.currency === curr.code) ||
        (t.type === TransactionType.EXCHANGE && t.currency === curr.code)
      ).reduce((sum, t) => sum + t.amount, 0);

      const sellToCustomer = todayTrans.filter(t => 
        (t.type === TransactionType.BOARD && t.currency === curr.code) ||
        (t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code)
      ).reduce((sum, t) => sum + (t.type === TransactionType.EXCHANGE ? (t.convertedAmount || 0) : t.amount), 0);

      const profit = todayTrans
        .filter(t => t.currency === curr.code)
        .reduce((sum, t) => sum + (t.profit || 0), 0);

      stats[curr.code] = {
        buy: buyFromCustomer,
        sell: sellToCustomer,
        net: buyFromCustomer - sellToCustomer,
        profit: profit
      };
    });

    return stats;
  }, [transactions, selectedDate]);

  const totalDailyProfitAfn = useMemo(() => {
    return transactions
      .filter(t => t.status === TransactionStatus.APPROVED && isSameDay(new Date(t.timestamp), selectedDate))
      .reduce((sum, t) => sum + (t.profit || 0), 0);
  }, [transactions, selectedDate]);

  const exchangeOnlyProfitAfn = useMemo(() => {
    return transactions
      .filter(t => 
        t.status === TransactionStatus.APPROVED && 
        isSameDay(new Date(t.timestamp), selectedDate) &&
        t.type === TransactionType.EXCHANGE
      )
      .reduce((sum, t) => sum + (t.profit || 0), 0);
  }, [transactions, selectedDate]);

  const persianDate = selectedDate.toLocaleDateString('fa-IR', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-24">
      
      {/* 1. Daily Navigation and Profit Header */}
      <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <button onClick={() => changeDay(1)} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 rounded-2xl transition-all"><ChevronRight size={24} /></button>
              <div>
                 <h3 className="text-xl font-black text-slate-900">{persianDate}</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase mt-1">تراز ارزی و سود عملیاتی</p>
              </div>
              <button onClick={() => changeDay(-1)} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 rounded-2xl transition-all"><ChevronLeft size={24} /></button>
           </div>
           {!isSameDay(selectedDate, new Date()) && (
              <button onClick={() => setSelectedDate(new Date())} className="bg-blue-50 text-blue-600 px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2"><Target size={16} /> بازگشت به امروز</button>
           )}
        </div>

        <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center gap-12 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Activity size={80} /></div>
           
           <div className="relative z-10 border-l border-white/10 pl-10">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">مجموع سود معاملات (AFN)</p>
              <h4 className="text-3xl font-black text-white">{totalDailyProfitAfn.toLocaleString()}</h4>
           </div>

           <div className="relative z-10 border-l border-white/10 pl-10 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-emerald-400" />
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">سود خالص از تبادله</p>
              </div>
              <h4 className="text-3xl font-black text-emerald-400">{exchangeOnlyProfitAfn.toLocaleString()}</h4>
           </div>

           <div className="relative z-10 hidden lg:block">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">اسناد تائید شده</p>
              <p className="text-xl font-black">{transactions.filter(t => isSameDay(new Date(t.timestamp), selectedDate) && t.status === TransactionStatus.APPROVED).length} سند</p>
           </div>
        </div>
      </div>

      {/* 2. Inventory and Volume Table */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
           <div>
              <h3 className="text-xl font-black text-slate-900">وضعیت توازن ارزها (Inventory)</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium italic">تحلیل حجم خرید و فروش شامل تبادلات داخلی</p>
           </div>
           <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><ArrowRightLeft size={24} /></div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100">
                <th className="py-6 px-10 font-black text-[10px] uppercase tracking-widest">واحد اسعار</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest text-emerald-600">ورودی / خرید</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest text-rose-600">خروجی / فروش</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest">خالص تراز (Net)</th>
                <th className="py-6 px-10 font-black text-[10px] uppercase tracking-widest text-left">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {SUPPORTED_CURRENCIES.map(curr => {
                const s = dailyExchangeStats[curr.code];
                return (
                  <tr key={curr.code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-8 px-10 font-black text-slate-800">{curr.label}</td>
                    <td className="py-8 px-4 font-black text-base text-emerald-600">{s.buy.toLocaleString()}</td>
                    <td className="py-8 px-4 font-black text-base text-rose-500">{s.sell.toLocaleString()}</td>
                    <td className={`py-8 px-4 font-black text-base ${s.net >= 0 ? 'text-blue-600' : 'text-rose-700'}`}>
                       {s.net > 0 ? '+' : ''}{s.net.toLocaleString()}
                    </td>
                    <td className="py-8 px-10 text-left">
                       {s.net !== 0 ? (
                         <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${s.net > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                           {s.net > 0 ? 'مازاد موجودی' : 'کسری موجودی'}
                         </span>
                       ) : <span className="text-slate-300 text-xs italic">بدون گردش</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Specialized Net Profit Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Net Profit Summary Card */}
        <div className="lg:col-span-4 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between h-full relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none text-emerald-600"><TrendingUp size={200} /></div>
          <div>
            <div className="flex items-center gap-4 mb-8">
               <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem]"><Sparkles size={28} /></div>
               <h3 className="text-xl font-black text-slate-900">گزارش سود خالص</h3>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">سود ناخالص عملیاتی</p>
                <p className="text-2xl font-black text-slate-800">{totalDailyProfitAfn.toLocaleString()} <span className="text-xs text-slate-400">AFN</span></p>
              </div>
              <div className="pt-6 border-t border-slate-50">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">سود خالص از تبادلات (Net)</p>
                <p className="text-4xl font-black text-emerald-600">{exchangeOnlyProfitAfn.toLocaleString()} <span className="text-xs text-emerald-400">AFN</span></p>
              </div>
            </div>
          </div>
          <div className="mt-10 p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
             <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
               این سود از مابه‌التفاوت نرخ‌های خرید و فروش در تبادلات داخلی (Internal Exchanges) محاسبه شده است.
             </p>
          </div>
        </div>

        {/* Currency Profit Breakdown */}
        <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                 <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem]"><BarChart3 size={28} /></div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900">سود خالص به تفکیک واحد پول</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Net Profit Breakdown by Currency</p>
                 </div>
              </div>
              <div className="p-3 bg-slate-50 text-slate-400 rounded-xl"><DollarSign size={20} /></div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SUPPORTED_CURRENCIES.map(curr => {
                const s = dailyExchangeStats[curr.code];
                if (!s || s.profit === 0) return null;
                return (
                  <div key={curr.code} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex justify-between items-center hover:bg-white hover:shadow-md transition-all group">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">{curr.symbol}</div>
                        <div>
                           <p className="font-black text-slate-800 text-sm">{curr.label}</p>
                           <p className="text-[9px] text-slate-400 font-black uppercase">{curr.code}</p>
                        </div>
                     </div>
                     <div className="text-left">
                        <p className="text-lg font-black text-emerald-600">{s.profit.toLocaleString()}</p>
                        <p className="text-[9px] font-black text-emerald-400 uppercase">AFN PROFIT</p>
                     </div>
                  </div>
                );
              })}
              {/* Fix: Explicitly type the parameter 's' in .every() to avoid 'Property 'profit' does not exist on type 'unknown'' error */}
              {Object.values(dailyExchangeStats).every((s: any) => s.profit === 0) && (
                <div className="col-span-full py-12 text-center text-slate-300 italic flex flex-col items-center gap-4">
                   <div className="p-5 bg-slate-50 rounded-full"><Coins size={40} /></div>
                   <p className="font-bold">در این تاریخ سودی از تبادلات ثبت نشده است.</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 4. Help Footer */}
      <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100 flex items-start gap-6">
         <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
           <ShieldCheck size={24} />
         </div>
         <div>
            <h4 className="font-black text-blue-900 mb-1">درباره گزارش سود خالص</h4>
            <p className="text-xs text-blue-700/80 leading-relaxed font-medium">
              گزارش سود خالص بر اساس فیلد «سود معامله» در زمان ثبت تبادله ارزی محاسبه می‌شود. این آمار به مدیر کمک می‌کند تا بهره‌وری هر واحد پول را در چرخه معاملات روزانه بسنجد. سود نمایش داده شده معادل افغانی (Base AFN) در لحظه معامله است.
            </p>
         </div>
      </div>

    </div>
  );
};

export default ExchangeBalances;
