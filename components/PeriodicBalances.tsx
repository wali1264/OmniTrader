
import React, { useState, useMemo } from 'react';
import { 
  CalendarRange, Search, TrendingUp, TrendingDown, 
  ChevronRight, Filter, Info, Clock, Lock, Unlock, CheckCircle2
} from 'lucide-react';
import { Transaction, Customer, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES } from '../types';

const getSystemNow = () => Date.now();

type PeriodType = 'weekly' | 'monthly' | 'quarterly';

interface PeriodicBalancesProps {
  transactions: Transaction[];
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const PeriodicBalances: React.FC<PeriodicBalancesProps> = ({ transactions, customers, setCustomers }) => {
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [searchTerm, setSearchTerm] = useState('');

  const getPeriodRange = (type: PeriodType) => {
    const now = new Date(getSystemNow());
    const start = new Date(now);
    if (type === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 6 ? 0 : -day - 1); 
      start.setDate(diff);
    } else if (type === 'monthly') {
      start.setDate(1);
    } else if (type === 'quarterly') {
      start.setMonth(now.getMonth() - 3);
    }
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end: now.getTime() };
  };

  const handleToggleLock = (customerId: string) => {
    setCustomers(prev => prev.map(c => 
      c.id === customerId ? { ...c, isLocked: !c.isLocked } : c
    ));
  };

  const periodicData = useMemo(() => {
    const { start, end } = getPeriodRange(periodType);
    const approvedInRange = transactions.filter(t => 
      t.status === TransactionStatus.APPROVED && 
      t.timestamp >= start && 
      t.timestamp <= end
    );
    
    // مجموع تمام تراکنش‌های تائید شده (بدون محدودیت زمانی) برای بیلانس نهایی
    const allApproved = transactions.filter(t => t.status === TransactionStatus.APPROVED);

    return customers
      .filter(c => c.name.includes(searchTerm) || c.code.includes(searchTerm))
      .map(customer => {
        const movement: Record<string, number> = {};
        const totalBalances: Record<string, number> = {};

        SUPPORTED_CURRENCIES.forEach(curr => {
          // محاسبه حرکت دوره‌ای (Credit - Debit) برای نمایش خالص تغییرات دوره
          const residP = approvedInRange.filter(t => t.customerId === customer.id && t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
          const boardP = approvedInRange.filter(t => t.customerId === customer.id && t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
          const exInP = approvedInRange.filter(t => t.customerId === customer.id && t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code).reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
          const exOutP = approvedInRange.filter(t => t.customerId === customer.id && t.type === TransactionType.EXCHANGE && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
          movement[curr.code] = (residP + exInP) - (boardP + exOutP);

          // محاسبه بیلانس نهایی کل (Debit - Credit) مطابق منطق صرافی
          // مثبت یعنی بدهکار (سرخ) و منفی یعنی بستانکار/پول پیش ما (سبز)
          const initial = customer.balances[curr.code] || 0;
          const residT = allApproved.filter(t => t.customerId === customer.id && t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
          const boardT = allApproved.filter(t => t.customerId === customer.id && t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
          const exInT = allApproved.filter(t => t.customerId === customer.id && t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code).reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
          const exOutT = allApproved.filter(t => t.customerId === customer.id && t.type === TransactionType.EXCHANGE && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
          
          totalBalances[curr.code] = initial + (boardT + exOutT) - (residT + exInT);
        });

        return { ...customer, movement, totalBalances };
      })
      .filter(c => Object.values(c.movement).some(v => v !== 0) || c.isLocked);
  }, [transactions, customers, periodType, searchTerm]);

  return (
    <div className="space-y-6 text-right font-['Vazirmatn'] pb-20 fade-entry">
      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
           <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><CalendarRange size={24} /></div>
           <div className="text-right">
              <h3 className="text-2xl font-black text-slate-900">تراز دوره‌ای و قید حساب</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Settlement & Periodic Balance Tracker</p>
           </div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => setPeriodType('weekly')} className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${periodType === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>هفته‌وار</button>
          <button onClick={() => setPeriodType('monthly')} className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${periodType === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>ماه‌وار</button>
          <button onClick={() => setPeriodType('quarterly')} className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${periodType === 'quarterly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>ربع‌وار</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
         <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input type="text" placeholder="جستجو در تراز..." className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pr-12 pl-4 text-xs font-bold outline-none focus:bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
         </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b">
              <tr className="text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="p-6 font-black text-right">مشتری</th>
                {SUPPORTED_CURRENCIES.map(curr => <th key={curr.code} className="p-6 text-center font-black">{curr.label} (دوره)</th>)}
                <th className="p-6 text-center font-black bg-blue-50/30">بیلانس کل فعلی</th>
                <th className="p-6 text-left font-black">وضعیت قید</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {periodicData.map(c => (
                <tr key={c.id} className={`group hover:bg-slate-50/50 transition-all ${c.isLocked ? 'bg-rose-50/20' : ''}`}>
                  <td className="p-6 border-r border-slate-50 relative">
                    {c.isLocked && <div className="absolute top-0 right-0 bottom-0 w-1 bg-rose-500"></div>}
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${c.isLocked ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                        {c.name.charAt(0)}
                      </div>
                      <div className="text-right">
                         <p className="font-black text-slate-900">{c.name}</p>
                         <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">ID: {c.code}</p>
                      </div>
                    </div>
                  </td>
                  {SUPPORTED_CURRENCIES.map(curr => {
                    const val = c.movement[curr.code] || 0;
                    return (
                      <td key={curr.code} className={`p-6 text-center font-black tabular-nums ${val > 0 ? 'text-emerald-600' : val < 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                        {val !== 0 ? (val > 0 ? '+' : '') + val.toLocaleString() : '---'}
                      </td>
                    );
                  })}
                  <td className="p-6 bg-blue-50/10 text-center">
                     <div className="space-y-1">
                        {SUPPORTED_CURRENCIES.map(curr => {
                           const bal = c.totalBalances[curr.code] || 0;
                           if (bal === 0) return null;
                           // اگر bal > 0 باشد یعنی بدهکار است (قرض‌دار) -> رنگ سرخ (rose-600)
                           // اگر bal < 0 باشد یعنی بستانکار است (پول پیش ما دارد) -> رنگ سبز (emerald-600)
                           return (
                             <p key={curr.code} className={`text-[10px] font-black tabular-nums ${bal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {Math.abs(bal).toLocaleString()} <span className="text-[8px] opacity-50">{curr.code}</span>
                                <span className="text-[7px] mr-1 opacity-40">({bal > 0 ? 'بدهکار' : 'بستانکار'})</span>
                             </p>
                           );
                        })}
                     </div>
                  </td>
                  <td className="p-6 text-left">
                     <button 
                       onClick={() => handleToggleLock(c.id)}
                       className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${c.isLocked ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-100 text-slate-400 hover:bg-slate-200'}`}
                     >
                        {c.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                        {c.isLocked ? 'حساب قید شده' : 'قید حساب'}
                     </button>
                  </td>
                </tr>
              ))}
              {periodicData.length === 0 && (
                <tr>
                   <td colSpan={SUPPORTED_CURRENCIES.length + 3} className="p-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-200">
                         <Clock size={64} className="opacity-10" />
                         <p className="text-sm font-black italic">هیچ تغییری در این بازه زمانی ثبت نشده است.</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-center gap-4 text-right">
         <Info className="text-blue-500 shrink-0" size={20} />
         <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
            راهنما: با کلیک بر روی دکمه **«قید حساب»**، می‌توانید حساب مشتریانی را که تصفیه نهایی شده‌اند علامت‌گذاری کنید. ستون «بیلانس کل» مجموع کل بدهی (قرض - رنگ سرخ) یا طلب (پیش ما - رنگ سبز) مشتری را نمایش می‌دهد.
         </p>
      </div>
    </div>
  );
};

export default PeriodicBalances;
