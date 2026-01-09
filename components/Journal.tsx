
import React, { useMemo, useState } from 'react';
import { 
  BookOpen, Search, ChevronRight, ChevronLeft, 
  TrendingUp, CreditCard, Hash
} from 'lucide-react';
import { Transaction, TransactionType, Customer, TransactionStatus, GlobalRate } from '../types';

const SYSTEM_TIME_OFFSET = 3600000;
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
        return matchesDay && (!search || name.includes(search) || t.description.includes(search));
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, selectedDate, search, customers]);

  const dailyTotalProfitAfn = useMemo(() => {
    return dailyTransactions
      .filter(t => t.status === TransactionStatus.APPROVED && t.netProfit !== undefined && !t.isBank)
      .reduce((sum, t) => sum + (t.netProfit || 0), 0);
  }, [dailyTransactions]);

  const profitStats = useMemo(() => {
    const getRate = (code: string) => globalRates.find(r => r.currencyCode === code)?.rateToAfn || 0;
    const usdRate = getRate('USD');
    const pkrRate = getRate('PKR');
    const irtRate = getRate('IRT_CASH');
    const eurRate = (usdRate > 0) ? usdRate * 1.08 : 0;

    return [
      { label: 'افغانی', value: dailyTotalProfitAfn, unit: 'AFN', color: 'text-emerald-700', bg: 'bg-emerald-50' },
      { label: 'دالر', value: usdRate > 0 ? dailyTotalProfitAfn / usdRate : 0, unit: 'USD', color: 'text-blue-700', bg: 'bg-blue-50' },
      { label: 'تومان', value: irtRate > 0 ? dailyTotalProfitAfn / irtRate : 0, unit: 'IRT', color: 'text-amber-700', bg: 'bg-amber-50' },
      { label: 'کلدار', value: pkrRate > 0 ? dailyTotalProfitAfn / pkrRate : 0, unit: 'PKR', color: 'text-purple-700', bg: 'bg-purple-50' },
      { label: 'ایرو', value: eurRate > 0 ? dailyTotalProfitAfn / eurRate : 0, unit: 'EUR', color: 'text-indigo-700', bg: 'bg-indigo-50' },
    ];
  }, [dailyTotalProfitAfn, globalRates]);

  const persianDate = selectedDate.toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 text-right fade-entry font-['Vazirmatn']">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 order-2 md:order-1">
            <button onClick={() => changeDay(1)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"><ChevronRight size={18} /></button>
            <div className="min-w-[150px] text-center">
              <h3 className="text-sm font-black text-slate-800">{persianDate}</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">تحلیل عملکرد مالی روز</p>
            </div>
            <button onClick={() => changeDay(-1)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"><ChevronLeft size={18} /></button>
          </div>

          <div className="relative w-full md:w-64 order-1 md:order-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="جستجو در اسناد امروز..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-[11px] font-bold outline-none focus:bg-white focus:border-blue-400 transition-all text-right" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="border-t border-slate-50 pt-4">
          <h4 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-widest flex items-center gap-2">
             <TrendingUp size={14} className="text-emerald-500" /> مفاد خالص امروز (به تفکیک ارزها):
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {profitStats.map((stat, idx) => (
              <div key={idx} className={`${stat.bg} p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center transition-all hover:shadow-md`}>
                <span className={`block text-[8px] font-black uppercase mb-1 opacity-60 ${stat.color}`}>{stat.label}</span>
                <span className={`block text-sm font-black tnum ${stat.color}`}>
                  {stat.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className={`block text-[8px] font-bold opacity-40 uppercase ${stat.color}`}>{stat.unit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-slate-400" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">لیست تراکنش‌های روزانه</h3>
            </div>
            <span className="text-[9px] font-bold text-slate-400 tabular-nums uppercase">{dailyTransactions.length} ردیف سند</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                <th className="py-4 px-6 font-bold text-right">ساعت</th>
                <th className="py-4 px-6 font-bold text-right">طرف حساب</th>
                <th className="py-4 px-6 font-bold text-emerald-700 text-center">رسید (+)</th>
                <th className="py-4 px-6 font-bold text-rose-700 text-center">برد (-)</th>
                <th className="py-4 px-6 font-bold text-right">شرح و جزئیات سند</th>
                <th className="py-4 px-6 font-bold text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyTransactions.map(t => {
                const customer = customers.find(c => c.id === t.customerId);
                const displayName = customer?.name || t.guestName || 'تراکنش آزاد نقد';
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 text-slate-400 font-mono tnum text-right">{new Date(t.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-4 px-6 font-black text-slate-800 text-right">{displayName}</td>
                    <td className="py-4 px-6 font-black text-emerald-700 tnum text-center">{t.type === TransactionType.RESID ? `${t.amount.toLocaleString()} ${t.currency}` : '-'}</td>
                    <td className="py-4 px-6 font-black text-rose-700 tnum text-center">{t.type === TransactionType.BOARD ? `${t.amount.toLocaleString()} ${t.currency}` : '-'}</td>
                    <td className="py-4 px-6 text-slate-500 font-medium leading-relaxed text-right">
                      <div className="flex flex-col gap-1">
                        <span>{t.description || 'بدون توضیحات'}</span>
                        
                        {/* نمایش اطلاعات بانکی در صورت وجود */}
                        {(t.cardLastFour || t.trackingId) && (
                          <div className="flex flex-wrap gap-2 items-center mt-1">
                            {t.cardLastFour && (
                              <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-black tabular-nums">
                                <CreditCard size={10} /> **** {t.cardLastFour}
                              </span>
                            )}
                            {t.trackingId && (
                              <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-black tabular-nums">
                                <Hash size={10} /> سریال: {t.trackingId}
                              </span>
                            )}
                          </div>
                        )}

                        {t.netProfit !== undefined && (
                          <span className={`font-black text-[9px] uppercase tracking-tighter ${t.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.netProfit >= 0 ? 'مفاد: ' : 'ضرر: '} {Math.abs(t.netProfit).toLocaleString()} AFN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${t.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                        {t.status === 'approved' ? 'تائید شده' : 'در انتظار'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {dailyTransactions.length === 0 && (
                <tr><td colSpan={6} className="py-24 text-center text-slate-300 font-black italic">هیچ تراکنشی برای نمایش در این تاریخ ثبت نشده است.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Journal;
