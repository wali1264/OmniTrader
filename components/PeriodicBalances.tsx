import React, { useState, useMemo } from 'react';
import { 
  CalendarRange, Search, TrendingUp, TrendingDown, 
  ChevronRight, Filter, Info, Clock
} from 'lucide-react';
import { Transaction, Customer, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES } from '../types';

const SYSTEM_TIME_OFFSET = 3600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;

type PeriodType = 'weekly' | 'monthly' | 'quarterly';

interface PeriodicBalancesProps {
  transactions: Transaction[];
  customers: Customer[];
}

const PeriodicBalances: React.FC<PeriodicBalancesProps> = ({ transactions, customers }) => {
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [searchTerm, setSearchTerm] = useState('');

  const getPeriodRange = (type: PeriodType) => {
    const now = new Date(getSystemNow());
    const start = new Date(now);
    
    if (type === 'weekly') {
      // شروع هفته از شنبه (در اکثر تقویم‌های اسلامی)
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

  const getPeriodLabel = () => {
    switch(periodType) {
      case 'weekly': return 'هفته جاری';
      case 'monthly': return 'ماه جاری';
      case 'quarterly': return 'سه ماه اخیر (ربع)';
      default: return '';
    }
  };

  const periodicData = useMemo(() => {
    const { start, end } = getPeriodRange(periodType);
    const approvedInRange = transactions.filter(t => 
      t.status === TransactionStatus.APPROVED && 
      t.timestamp >= start && 
      t.timestamp <= end
    );

    return customers
      .filter(c => c.name.includes(searchTerm) || c.code.includes(searchTerm))
      .map(customer => {
        const movement: Record<string, number> = {};
        SUPPORTED_CURRENCIES.forEach(curr => {
          const resid = approvedInRange
            .filter(t => t.customerId === customer.id && t.type === TransactionType.RESID && t.currency === curr.code)
            .reduce((sum, t) => sum + t.amount, 0);
          
          const board = approvedInRange
            .filter(t => t.customerId === customer.id && t.type === TransactionType.BOARD && t.currency === curr.code)
            .reduce((sum, t) => sum + t.amount, 0);
          
          const exIn = approvedInRange
            .filter(t => t.customerId === customer.id && t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code)
            .reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
          
          const exOut = approvedInRange
            .filter(t => t.customerId === customer.id && t.type === TransactionType.EXCHANGE && t.currency === curr.code)
            .reduce((sum, t) => sum + t.amount, 0);

          movement[curr.code] = (resid + exIn) - (board + exOut);
        });
        return { ...customer, movement };
      })
      .filter(c => Object.values(c.movement).some(v => v !== 0)); // فقط مشتریانی که فعالیت داشته‌اند
  }, [transactions, customers, periodType, searchTerm]);

  return (
    <div className="space-y-6 fade-entry text-right font-['Vazirmatn']">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem] shadow-inner">
            <CalendarRange size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">تراز دوره‌ای موجودی مشتریان</h3>
            <p className="text-sm text-slate-400 mt-1 font-bold">نمایش خالص تغییرات بیلانس در بازه‌های زمانی مشخص.</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200">
          <button 
            onClick={() => setPeriodType('weekly')} 
            className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${periodType === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            آخر هفته
          </button>
          <button 
            onClick={() => setPeriodType('monthly')} 
            className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${periodType === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            ماهوار
          </button>
          <button 
            onClick={() => setPeriodType('quarterly')} 
            className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${periodType === 'quarterly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            ربع (۳ ماه)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-slate-400" />
            <span className="text-sm font-black text-slate-700">تغییرات بیلانس در <span className="text-blue-600">{getPeriodLabel()}</span></span>
          </div>
          <div className="relative w-64">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="جستجوی مشتری..." 
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-10 pl-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all text-right"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-5 font-black border-b border-slate-200 text-right">کد</th>
                <th className="p-5 font-black border-b border-slate-200 text-right">نام مشتری</th>
                {SUPPORTED_CURRENCIES.map(curr => (
                  <th key={curr.code} className="p-5 font-black border-b border-slate-200 text-center">{curr.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periodicData.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-5 text-slate-400 font-bold tabular-nums text-right">{c.code}</td>
                  <td className="p-5 font-black text-slate-800 text-right">{c.name}</td>
                  {SUPPORTED_CURRENCIES.map(curr => {
                    const move = c.movement[curr.code] || 0;
                    return (
                      <td key={curr.code} className={`p-5 text-center tabular-nums font-black ${move > 0 ? 'text-emerald-600' : move < 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                        {move !== 0 ? (
                          <div className="flex items-center justify-center gap-2">
                            {move > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {move.toLocaleString()}
                          </div>
                        ) : '---'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {periodicData.length === 0 && (
                <tr>
                  <td colSpan={SUPPORTED_CURRENCIES.length + 2} className="py-24 text-center text-slate-300 italic font-bold">
                    هیچ تراکنشی در بازه <span className="text-blue-600">{getPeriodLabel()}</span> یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4 text-blue-700">
        <Info size={20} className="shrink-0 mt-0.5" />
        <div className="text-xs font-bold leading-relaxed">
          <p>این لیست صرفاً «خالص تغییرات» (تفاضل کل ورودی و خروجی) هر مشتری را در بازه زمانی انتخابی نمایش می‌دهد.</p>
          <p className="mt-1 opacity-70">اعداد مثبت نشان‌دهنده افزایش بستانکاری مشتری و اعداد منفی نشان‌دهنده بدهکار شدن یا برداشت مشتری در این دوره است.</p>
        </div>
      </div>
    </div>
  );
};

export default PeriodicBalances;