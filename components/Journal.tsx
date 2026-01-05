
import React, { useMemo, useState } from 'react';
import { 
  BookOpen, Search, ChevronRight, ChevronLeft, 
  ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, Calculator
} from 'lucide-react';
import { Transaction, TransactionType, Customer, SUPPORTED_CURRENCIES, TransactionStatus } from '../types';

interface JournalProps {
  transactions: Transaction[];
  customers: Customer[];
}

const Journal: React.FC<JournalProps> = ({ transactions, customers }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState('');

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

  const dailyTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const tDate = new Date(t.timestamp);
        const matchesDay = isSameDay(tDate, selectedDate);
        const customer = customers.find(c => c.id === t.customerId);
        const name = customer?.name || t.guestName || '';
        return matchesDay && (!search || name.includes(search) || t.description.includes(search));
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, selectedDate, search, customers]);

  const dailySummary = useMemo(() => {
    const profit = dailyTransactions
      .filter(t => t.type === TransactionType.EXCHANGE && t.status === TransactionStatus.APPROVED)
      .reduce((sum, t) => sum + (t.netProfit || 0), 0);
    
    return { profit };
  }, [dailyTransactions]);

  const persianDate = selectedDate.toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => changeDay(1)} className="p-2.5 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"><ChevronRight size={20} /></button>
          <div className="text-center md:text-right min-w-[160px]">
            <h3 className="text-base font-black text-slate-900">{persianDate}</h3>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">صندوق روزانه</p>
          </div>
          <button onClick={() => changeDay(-1)} className="p-2.5 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"><ChevronLeft size={20} /></button>
        </div>

        {/* بخش نمایش سود و ضرر روزانه */}
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1 justify-center lg:justify-start">
           <div className={`p-2.5 rounded-xl ${dailySummary.profit >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {dailySummary.profit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
           </div>
           <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">خلاصه بیلانس مفاد/ضرر امروز:</p>
              <h4 className={`text-lg font-black tabular-nums ${dailySummary.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {dailySummary.profit.toLocaleString()}
                <span className="text-[10px] mr-1 opacity-60">AFN</span>
                {dailySummary.profit >= 0 ? ' (مفاد)' : ' (ضرر)'}
              </h4>
           </div>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
          <input type="text" placeholder="جستجوی سند..." className="bg-slate-50 border border-slate-100 rounded-xl py-2 pr-9 pl-4 text-[11px] font-bold w-56 outline-none focus:bg-white transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100">
              <th className="py-4 px-6 font-black text-[9px] uppercase">زمان</th>
              <th className="py-4 px-4 font-black text-[9px] uppercase">طرف حساب</th>
              <th className="py-4 px-4 font-black text-[9px] uppercase text-emerald-600">رسید (+)</th>
              <th className="py-4 px-4 font-black text-[9px] uppercase text-rose-600">برد (-)</th>
              <th className="py-4 px-4 font-black text-[9px] uppercase">شرح</th>
              <th className="py-4 px-6 font-black text-[9px] uppercase text-center">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {dailyTransactions.map(t => {
              const customer = customers.find(c => c.id === t.customerId);
              const displayName = customer?.name || t.guestName || 'تراکنش آزاد';
              return (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-4 px-6 text-slate-400 font-mono text-[10px] tnum">{new Date(t.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="py-4 px-4 font-black text-slate-800 text-[12px]">{displayName}</td>
                  <td className="py-4 px-4 font-black text-[13px] text-emerald-600 tnum">{t.type === TransactionType.RESID ? `${t.amount.toLocaleString()} ${t.currency}` : '-'}</td>
                  <td className="py-4 px-4 font-black text-[13px] text-rose-600 tnum">{t.type === TransactionType.BOARD ? `${t.amount.toLocaleString()} ${t.currency}` : '-'}</td>
                  <td className="py-4 px-4 text-slate-500 font-medium truncate max-w-[180px] text-[10px]">
                    {t.description || '---'}
                    {t.netProfit ? <span className="mr-2 text-[8px] text-emerald-500 bg-emerald-50 px-1 rounded">(مفاد: {t.netProfit.toLocaleString()})</span> : null}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black ${t.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {t.status === 'approved' ? 'تائید' : t.status === 'pending' ? 'انتظار' : 'رد'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {dailyTransactions.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-slate-300 font-bold italic text-[11px]">در این تاریخ تراکنشی ثبت نشده است.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Journal;
