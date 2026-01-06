
import React, { useMemo, useState } from 'react';
import { 
  BookOpen, Search, ChevronRight, ChevronLeft, 
  ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, Calculator
} from 'lucide-react';
import { Transaction, TransactionType, Customer, SUPPORTED_CURRENCIES, TransactionStatus } from '../types';

const SYSTEM_TIME_OFFSET = 3600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;

interface JournalProps {
  transactions: Transaction[];
  customers: Customer[];
}

const Journal: React.FC<JournalProps> = ({ transactions, customers }) => {
  const [selectedDate, setSelectedDate] = useState(new Date(getSystemNow()));
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

  const dailyExchangeProfit = useMemo(() => {
    return dailyTransactions
      .filter(t => t.type === TransactionType.EXCHANGE && t.status === TransactionStatus.APPROVED)
      .reduce((sum, t) => sum + (t.netProfit || 0), 0);
  }, [dailyTransactions]);

  const persianDate = selectedDate.toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 text-right fade-entry">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 order-2 md:order-1">
          <button onClick={() => changeDay(1)} className="p-2 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100"><ChevronRight size={16} /></button>
          <div className="min-w-[150px] text-center">
            <h3 className="text-sm font-bold text-slate-800">{persianDate}</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">وضعیت دفتر کل روزانه</p>
          </div>
          <button onClick={() => changeDay(-1)} className="p-2 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100"><ChevronLeft size={16} /></button>
        </div>

        <div className="flex items-center gap-4 order-3">
          <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-lg flex items-center gap-3">
            <div className="text-right">
              <span className="block text-[8px] font-black text-emerald-600 uppercase">مفاد خالص تبادلات امروز</span>
              <span className="block text-sm font-black text-emerald-700 tnum">{dailyExchangeProfit.toLocaleString()} <span className="text-[9px]">AFN</span></span>
            </div>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
        </div>

        <div className="relative w-full md:w-64 order-1 md:order-2">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          <input type="text" placeholder="جستجو در اسناد امروز..." className="w-full bg-slate-50 border border-slate-200 rounded py-2 pr-9 pl-3 text-[11px] font-bold outline-none focus:bg-white focus:border-indigo-400" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">لیست کلی تراکنش‌ها</h3>
        </div>
        <table className="w-full text-right text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
              <th className="py-3 px-4 font-bold border-l border-slate-100">ساعت</th>
              <th className="py-3 px-4 font-bold border-l border-slate-100">طرف حساب</th>
              <th className="py-3 px-4 font-bold text-emerald-700 border-l border-slate-100">رسید (+)</th>
              <th className="py-3 px-4 font-bold text-rose-700 border-l border-slate-100">برد (-)</th>
              <th className="py-3 px-4 font-bold">شرح تراکنش</th>
              <th className="py-3 px-4 font-bold text-center">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dailyTransactions.map(t => {
              const customer = customers.find(c => c.id === t.customerId);
              const displayName = customer?.name || t.guestName || 'تراکنش آزاد نقد';
              return (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-mono tnum">{new Date(t.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{displayName}</td>
                  <td className="py-3 px-4 font-bold text-emerald-700 tnum">{t.type === TransactionType.RESID ? `${t.amount.toLocaleString()} ${t.currency}` : '-'}</td>
                  <td className="py-3 px-4 font-bold text-rose-700 tnum">{t.type === TransactionType.BOARD ? `${t.amount.toLocaleString()} ${t.currency}` : '-'}</td>
                  <td className="py-3 px-4 text-slate-500 font-medium truncate max-w-[250px] text-[10px]">
                    {t.description || 'بدون توضیحات'}
                    {t.type === TransactionType.EXCHANGE && t.netProfit && (
                      <span className="mr-2 text-emerald-600 font-bold">(سود: {t.netProfit.toLocaleString()})</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${t.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                      {t.status === 'approved' ? 'تائید' : 'انتظار'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {dailyTransactions.length === 0 && (
              <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-bold italic">هیچ تراکنشی برای نمایش در این تاریخ وجود ندارد.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Journal;
