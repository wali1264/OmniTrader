import React, { useMemo, useState } from 'react';
import { 
  BookOpen, Search, ChevronRight, ChevronLeft, 
  TrendingUp, CreditCard, Hash, Clock, User, 
  ArrowDownLeft, ArrowUpRight, FileText, CheckCircle2, 
  AlertCircle, Filter
} from 'lucide-react';
import { Transaction, TransactionType, Customer, TransactionStatus, SUPPORTED_CURRENCIES, GlobalRate } from '../types';

const SYSTEM_TIME_OFFSET = -21600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;

interface JournalProps {
  transactions: Transaction[];
  customers: Customer[];
  globalRates: GlobalRate[];
}

const Journal: React.FC<JournalProps> = ({ transactions, customers, globalRates }) => {
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
        const desc = t.description || '';
        return matchesDay && (!search || name.includes(search) || desc.includes(search));
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, selectedDate, search, customers]);

  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    SUPPORTED_CURRENCIES.forEach(curr => {
      const dayApproved = transactions.filter(t => 
        t.status === TransactionStatus.APPROVED && 
        isSameDay(new Date(t.timestamp), selectedDate) &&
        (t.currency === curr.code || t.targetCurrency === curr.code)
      );

      const resid = dayApproved.filter(t => t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      const board = dayApproved.filter(t => t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      
      const exIn = dayApproved.filter(t => t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code).reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
      const exOut = dayApproved.filter(t => t.type === TransactionType.EXCHANGE && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);

      totals[curr.code] = (resid + exIn) - (board + exOut);
    });
    return totals;
  }, [transactions, selectedDate]);

  const persianDate = selectedDate.toLocaleDateString('fa-IR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const getCurrencyStyle = (code: string) => {
    switch (code) {
      case 'IRT_CASH':
      case 'IRT_BANK': return 'bg-[#fffbeb] border-[#fef3c7] text-[#92400e]';
      case 'USD': return 'bg-[#eff6ff] border-[#dbeafe] text-[#1e40af]';
      case 'EUR': return 'bg-[#f5f3ff] border-[#ede9fe] text-[#5b21b6]';
      case 'PKR': return 'bg-[#fdf2f8] border-[#fce7f3] text-[#9d174d]';
      case 'AFN': return 'bg-[#f0fdf4] border-[#dcfce7] text-[#166534]';
      default: return 'bg-white border-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-6 text-right fade-entry font-['Vazirmatn'] pb-20" dir="rtl">
      {/* Header & Date Navigation */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative w-full md:w-80 order-2 md:order-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            type="text" 
            placeholder="جستجو در اسناد امروز..." 
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pr-12 pl-4 text-xs font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all text-right" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        <div className="flex items-center gap-6 order-1 md:order-2">
          <button onClick={() => changeDay(1)} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-white transition-all shadow-sm">
            <ChevronRight size={22} />
          </button>
          <div className="text-center min-w-[200px]">
            <h3 className="text-xl font-black text-slate-900 leading-none">{persianDate}</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">تحلیل عملکرد مالی روز</p>
          </div>
          <button onClick={() => changeDay(-1)} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-white transition-all shadow-sm">
            <ChevronLeft size={22} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mr-2">
           <TrendingUp size={16} className="text-emerald-500" />
           <span className="text-[11px] font-black text-slate-500 uppercase">مفاد خالص امروز (به تفکیک ارزها):</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {SUPPORTED_CURRENCIES.filter(c => c.code !== 'IRT_BANK').map(curr => {
            const total = dailyTotals[curr.code] || 0;
            return (
              <div key={curr.code} className={`p-6 rounded-[2rem] border shadow-sm transition-all hover:shadow-md ${getCurrencyStyle(curr.code)}`}>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black opacity-60 uppercase">{curr.label}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${total >= 0 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black tabular-nums tracking-tighter">
                    {total.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-black mt-1 uppercase opacity-40">{curr.code}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-3">
             <BookOpen size={20} className="text-blue-600" />
             <h4 className="text-lg font-black text-slate-900">لیست تراکنش‌های روزانه</h4>
          </div>
          <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">{dailyTransactions.length} ردیف سند</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-6 px-8 text-right font-black">ساعت</th>
                <th className="py-6 px-4 text-right font-black">طرف حساب</th>
                <th className="py-6 px-4 text-center font-black text-emerald-600">رسید (+)</th>
                <th className="py-6 px-4 text-center font-black text-rose-600">برد (-)</th>
                <th className="py-6 px-4 text-right font-black">شرح و جزئیات سند</th>
                <th className="py-6 px-8 text-left font-black">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dailyTransactions.map(t => {
                const customer = customers.find(c => c.id === t.customerId);
                const isResid = t.type === TransactionType.RESID;
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 group transition-all">
                    <td className="py-6 px-8 text-[11px] font-bold text-slate-400 tabular-nums">
                      {new Date(t.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-6 px-4">
                      <p className="text-sm font-black text-slate-900">{customer?.name || t.guestName || '---'}</p>
                      {t.isBank && (
                        <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-tighter">BANK SETTLEMENT</span>
                      )}
                    </td>
                    <td className="py-6 px-4 text-center">
                      {isResid ? (
                        <div className="inline-flex items-baseline gap-1 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl">
                          <span className="text-base font-black tabular-nums">{t.amount.toLocaleString()}</span>
                          <span className="text-[9px] font-black uppercase opacity-60">{t.currency}</span>
                        </div>
                      ) : '---'}
                    </td>
                    <td className="py-6 px-4 text-center">
                      {!isResid ? (
                        <div className="inline-flex items-baseline gap-1 bg-rose-50 text-rose-700 px-4 py-2 rounded-2xl">
                          <span className="text-base font-black tabular-nums">{t.amount.toLocaleString()}</span>
                          <span className="text-[9px] font-black uppercase opacity-60">{t.currency}</span>
                        </div>
                      ) : '---'}
                    </td>
                    <td className="py-6 px-4">
                      <p className="text-[10px] font-bold text-slate-500 max-w-xs leading-relaxed italic">
                        {t.description || 'ثبت در روزنامچه عمومی'}
                      </p>
                      {t.exchangeRate && (
                         <div className="flex items-center gap-2 mt-2">
                           <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest bg-blue-50/50 px-2 py-0.5 rounded">EXCHANGE RATE: {t.exchangeRate}</span>
                         </div>
                      )}
                    </td>
                    <td className="py-6 px-8 text-left">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        t.status === TransactionStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 
                        t.status === TransactionStatus.PENDING ? 'bg-amber-100 text-amber-700' : 
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {t.status === TransactionStatus.APPROVED ? 'تأیید' : t.status === TransactionStatus.PENDING ? 'انتظار' : 'رد شده'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {dailyTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-32">
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-4">
                      <FileText size={48} className="opacity-10" />
                      <p className="text-sm font-black italic">هیچ تراکنشی برای نمایش در این تاریخ ثبت نشده است.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Journal;