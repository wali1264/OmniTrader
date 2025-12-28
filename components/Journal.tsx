
import React, { useMemo, useState } from 'react';
import { 
  BookOpen, Search, Calendar, ChevronRight, ChevronLeft, 
  ArrowDownLeft, ArrowUpRight, Download, Filter, 
  Target, Info, FileSpreadsheet
} from 'lucide-react';
import { Transaction, TransactionType, Customer, SUPPORTED_CURRENCIES, TransactionStatus } from '../types';

interface JournalProps {
  transactions: Transaction[];
  customers: Customer[];
}

const Journal: React.FC<JournalProps> = ({ transactions, customers }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState('');

  // Helper to get start/end of day for filtering
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

  const goToToday = () => setSelectedDate(new Date());

  const dailyTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const tDate = new Date(t.timestamp);
        const matchesDay = isSameDay(tDate, selectedDate);
        const customer = customers.find(c => c.id === t.customerId);
        const matchesSearch = !search || 
          customer?.name.includes(search) || 
          t.description.includes(search);
        return matchesDay && matchesSearch;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, selectedDate, search, customers]);

  const dailyStatsByCurrency = useMemo(() => {
    const incoming: Record<string, number> = {};
    const outgoing: Record<string, number> = {};

    SUPPORTED_CURRENCIES.forEach(curr => {
      incoming[curr.code] = dailyTransactions
        .filter(t => t.type === TransactionType.RESID && t.currency === curr.code && t.status === TransactionStatus.APPROVED)
        .reduce((sum, t) => sum + t.amount, 0);
      
      outgoing[curr.code] = dailyTransactions
        .filter(t => t.type === TransactionType.BOARD && t.currency === curr.code && t.status === TransactionStatus.APPROVED)
        .reduce((sum, t) => sum + t.amount, 0);
    });

    return { incoming, outgoing };
  }, [dailyTransactions]);

  const persianDate = selectedDate.toLocaleDateString('fa-IR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Daily Navigation Header */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6 order-2 md:order-1">
          <button 
            onClick={() => changeDay(1)} 
            className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all"
            title="روز بعد"
          >
            <ChevronRight size={24} />
          </button>
          
          <div className="text-center md:text-right min-w-[200px]">
            <h3 className="text-2xl font-black text-slate-900 mb-1">{persianDate}</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
              <Calendar size={12} /> صفحه روزنامهچه کل
            </p>
          </div>

          <button 
            onClick={() => changeDay(-1)} 
            className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all"
            title="روز قبل"
          >
            <ChevronLeft size={24} />
          </button>
        </div>

        <div className="flex items-center gap-3 order-1 md:order-2">
          {!isSameDay(selectedDate, new Date()) && (
            <button 
              onClick={goToToday}
              className="px-6 py-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-100 transition-all flex items-center gap-2"
            >
              <Target size={16} /> بازگشت به امروز
            </button>
          )}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text"
              placeholder="جستجو در این صفحه..."
              className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold w-48 md:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 2. Daily Summary Sections by Currency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Incoming (Resid) Detailed Breakdown */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xl font-black text-emerald-700">مجموع ورودی امروز (رسید)</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">تفکیک بر اساس واحد ارز</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <ArrowDownLeft size={24} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {SUPPORTED_CURRENCIES.map(curr => (
              <div key={curr.code} className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100/50 flex flex-col">
                <span className="text-[9px] font-black text-emerald-600 uppercase mb-1">{curr.label}</span>
                <span className="text-lg font-black text-slate-800">
                  {dailyStatsByCurrency.incoming[curr.code].toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">{curr.code}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Outgoing (Board) Detailed Breakdown */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xl font-black text-rose-700">مجموع خروجی امروز (برد)</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">تفکیک بر اساس واحد ارز</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <ArrowUpRight size={24} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {SUPPORTED_CURRENCIES.map(curr => (
              <div key={curr.code} className="p-4 rounded-2xl bg-rose-50/30 border border-rose-100/50 flex flex-col">
                <span className="text-[9px] font-black text-rose-600 uppercase mb-1">{curr.label}</span>
                <span className="text-lg font-black text-slate-800">
                  {dailyStatsByCurrency.outgoing[curr.code].toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">{curr.code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Transaction Table (The Page Content) */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100">
                <th className="py-6 px-8 font-black text-[10px] uppercase tracking-widest">زمان دقیق</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest">مشتری / ذینفع</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest text-emerald-600">رسید (+)</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest text-rose-600">برد (-)</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest">روش پرداخت</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest">توضیحات تراکنش</th>
                <th className="py-6 px-8 font-black text-[10px] uppercase tracking-widest text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dailyTransactions.map(t => {
                const customer = customers.find(c => c.id === t.customerId);
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-6 px-8 text-slate-400 font-mono text-xs">
                      {new Date(t.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-6 px-4">
                      <p className="font-black text-slate-800 text-base">{customer?.name || 'تراکنش مستقیم'}</p>
                      <p className="text-[10px] text-slate-400 font-bold">کد: {customer?.code || '---'}</p>
                    </td>
                    <td className="py-6 px-4 font-black text-lg text-emerald-600">
                      {t.type === TransactionType.RESID ? t.amount.toLocaleString() : '-'}
                    </td>
                    <td className="py-6 px-4 font-black text-lg text-rose-600">
                      {t.type === TransactionType.BOARD ? t.amount.toLocaleString() : '-'}
                    </td>
                    <td className="py-6 px-4">
                      <div className="flex items-center gap-2">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${t.bankAccountId ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                           {t.bankAccountId ? 'بانکی' : 'نقدی'}
                         </span>
                         <span className="text-[10px] font-black text-slate-400">{t.currency}</span>
                      </div>
                    </td>
                    <td className="py-6 px-4 text-slate-500 font-medium max-w-[200px] truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                      {t.description || 'بدون توضیح'}
                    </td>
                    <td className="py-6 px-8 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${
                        t.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                        t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {t.status === 'approved' ? 'تائید شده' : t.status === 'pending' ? 'در انتظار' : 'رد شده'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {dailyTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-32 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                       <div className="p-6 bg-slate-50 rounded-full mb-4">
                         <BookOpen size={48} strokeWidth={1.5} />
                       </div>
                       <p className="font-black text-lg">در این تاریخ تراکنشی ثبت نشده است.</p>
                       <p className="text-sm font-medium italic mt-1">صفحه روزنامهچه امروز سفید است.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Help Note */}
      <div className="flex items-center gap-3 bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
        <div className="p-2 bg-blue-600 text-white rounded-xl"><Info size={18} /></div>
        <p className="text-xs text-blue-700 font-medium leading-relaxed">
           <strong>نکته مدیریت:</strong> تراز نهایی هر روز به صورت خودکار محاسبه می‌شود. برای مشاهده تراکنش‌های روزهای قبل، از فلش‌های ناوبری در بالای صفحه استفاده کنید. هر روز ساعت ۰۰:۰۰ بامداد یک صفحه جدید به صورت خودکار برای سیستم ایجاد می‌شود.
        </p>
      </div>

    </div>
  );
};

export default Journal;
