
import React, { useMemo, useState } from 'react';
import { 
  BookOpen, Search, Calendar, ChevronRight, ChevronLeft, 
  ArrowDownLeft, ArrowUpRight, Target
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
        return matchesDay && (!search || customer?.name.includes(search) || t.description.includes(search));
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, selectedDate, search, customers]);

  const dailyStatsByCurrency = useMemo(() => {
    const incoming: Record<string, number> = {};
    const outgoing: Record<string, number> = {};
    SUPPORTED_CURRENCIES.forEach(curr => {
      incoming[curr.code] = dailyTransactions.filter(t => t.type === TransactionType.RESID && t.currency === curr.code && t.status === TransactionStatus.APPROVED).reduce((sum, t) => sum + t.amount, 0);
      outgoing[curr.code] = dailyTransactions.filter(t => t.type === TransactionType.BOARD && t.currency === curr.code && t.status === TransactionStatus.APPROVED).reduce((sum, t) => sum + t.amount, 0);
    });
    return { incoming, outgoing };
  }, [dailyTransactions]);

  const persianDate = selectedDate.toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => changeDay(1)} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all"><ChevronRight size={24} /></button>
          <div className="text-center md:text-right min-w-[200px]">
            <h3 className="text-2xl font-black text-slate-900 mb-1">{persianDate}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">روزنامهچه کل صندوق</p>
          </div>
          <button onClick={() => changeDay(-1)} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all"><ChevronLeft size={24} /></button>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input type="text" placeholder="جستجوی سند..." className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold w-64 outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100">
              <th className="py-6 px-8 font-black text-[10px] uppercase">زمان</th>
              <th className="py-6 px-4 font-black text-[10px] uppercase">طرف حساب</th>
              <th className="py-6 px-4 font-black text-[10px] uppercase text-emerald-600">رسید (+)</th>
              <th className="py-6 px-4 font-black text-[10px] uppercase text-rose-600">برد (-)</th>
              <th className="py-6 px-4 font-black text-[10px] uppercase">توضیحات</th>
              <th className="py-6 px-8 font-black text-[10px] uppercase text-center">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {dailyTransactions.map(t => {
              const customer = customers.find(c => c.id === t.customerId);
              return (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-6 px-8 text-slate-400 font-mono text-xs">{new Date(t.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="py-6 px-4 font-black text-slate-800 text-base">{customer?.name || 'تراکنش آزاد'}</td>
                  <td className="py-6 px-4 font-black text-lg text-emerald-600">{t.type === TransactionType.RESID ? `${t.amount.toLocaleString()} ${t.currency}` : '-'}</td>
                  <td className="py-6 px-4 font-black text-lg text-rose-600">{t.type === TransactionType.BOARD ? `${t.amount.toLocaleString()} ${t.currency}` : '-'}</td>
                  <td className="py-6 px-4 text-slate-500 font-medium truncate max-w-[200px]">{t.description || '---'}</td>
                  <td className="py-6 px-8 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${t.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {t.status === 'approved' ? 'تائید شده' : t.status === 'pending' ? 'در انتظار' : 'رد شده'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Journal;
