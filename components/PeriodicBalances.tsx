import React, { useState, useMemo } from 'react';
import { 
  CalendarRange, Search, TrendingUp, TrendingDown, 
  ChevronRight, Filter, Info, Clock, Lock, Unlock, CheckCircle2,
  ShieldCheck,
  History,
  RotateCcw,
  List,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  X,
  AlertTriangle,
  Calculator,
  Printer,
  ChevronDown,
  LogOut
} from 'lucide-react';
import { Transaction, Customer, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES } from '../types';

// هماهنگی با زمان سیستم (UTC-6) مطابق App.tsx
const SYSTEM_TIME_OFFSET = -21600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;

type PeriodType = 'weekly' | 'monthly' | 'quarterly';

interface PeriodicBalancesProps {
  transactions: Transaction[];
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const PeriodicBalances: React.FC<PeriodicBalancesProps> = ({ transactions, customers, setCustomers }) => {
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [searchTerm, setSearchTerm] = useState('');
  const [redistributeData, setRedistributeData] = useState<{
    customerId: string,
    customerName: string,
    currencyCode: string,
    start: number,
    end: number
  } | null>(null);

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

  const handleFinalLock = (customerId: string) => {
    const now = getSystemNow();
    if (confirm('آیا از قید قطعی بیلانس تا این لحظه اطمینان دارید؟ با این کار بیلانس نهایی این دوره ذخیره شده و از این پس دفتر مشتری از این نقطه به بعد نمایش داده خواهد شد.')) {
      setCustomers(prev => prev.map(c => 
        c.id === customerId ? { ...c, isLocked: true, lastLockedTimestamp: now } : c
      ));
    }
  };

  const handleUnlock = (customerId: string) => {
    if (confirm('آیا می‌خواهید قید حساب را باز کنید؟ با باز کردن قید، تمام تاریخچه قبلی دوباره در دفتر قابل مشاهده خواهد بود.')) {
      setCustomers(prev => prev.map(c => 
        c.id === customerId ? { ...c, isLocked: false, lastLockedTimestamp: undefined } : c
      ));
    }
  };

  const periodicData = useMemo(() => {
    const { start, end } = getPeriodRange(periodType);
    const approvedAll = transactions.filter(t => t.status === TransactionStatus.APPROVED);
    const approvedInRange = approvedAll.filter(t => t.timestamp >= start && t.timestamp <= end);

    return customers
      .filter(c => c.name.includes(searchTerm) || c.code.includes(searchTerm))
      .map(customer => {
        const stats: Record<string, { received: number, paid: number, movement: number, totalBalance: number }> = {};

        SUPPORTED_CURRENCIES.forEach(curr => {
          const residP = approvedInRange.filter(t => t.customerId === customer.id && t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
          const boardP = approvedInRange.filter(t => t.customerId === customer.id && t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
          const exInP = approvedInRange.filter(t => t.customerId === customer.id && t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code).reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
          const exOutP = approvedInRange.filter(t => t.customerId === customer.id && t.type === TransactionType.EXCHANGE && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
          
          const totalReceived = residP + exInP;
          const totalPaid = boardP + exOutP;
          const movement = totalReceived - totalPaid;

          const initial = customer.balances[curr.code] || 0;
          const residT = approvedAll.filter(t => t.customerId === customer.id && t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
          const boardT = approvedAll.filter(t => t.customerId === customer.id && t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
          const exInT = approvedAll.filter(t => t.customerId === customer.id && t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code).reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
          const exOutT = approvedAll.filter(t => t.customerId === customer.id && t.type === TransactionType.EXCHANGE && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
          
          const totalBalance = initial + (boardT + exOutT) - (residT + exInT);

          stats[curr.code] = { received: totalReceived, paid: totalPaid, movement, totalBalance };
        });

        return { ...customer, stats };
      });
  }, [transactions, customers, periodType, searchTerm]);

  const auditResult = useMemo(() => {
    if (!redistributeData) return null;
    const { customerId, currencyCode, start, end } = redistributeData;
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return null;

    const approvedAll = transactions.filter(t => t.status === TransactionStatus.APPROVED && t.customerId === customerId);
    const initial = customer.balances[currencyCode] || 0;
    
    // محاسبه مانده دقیق تا قبل از شروع دوره بازتوزیع
    const pastTrans = approvedAll.filter(t => t.timestamp < start);
    const pastDebit = pastTrans.filter(t => t.type === TransactionType.BOARD && t.currency === currencyCode).reduce((sum, t) => sum + t.amount, 0) +
                      pastTrans.filter(t => t.type === TransactionType.EXCHANGE && t.currency === currencyCode).reduce((sum, t) => sum + t.amount, 0);
    const pastCredit = pastTrans.filter(t => t.type === TransactionType.RESID && t.currency === currencyCode).reduce((sum, t) => sum + t.amount, 0) +
                       pastTrans.filter(t => t.type === TransactionType.EXCHANGE && t.targetCurrency === currencyCode).reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
    
    let runningBalance = initial + pastDebit - pastCredit;
    const openingBalance = runningBalance;

    const currentTrans = approvedAll
      .filter(t => t.timestamp >= start && t.timestamp <= end && (t.currency === currencyCode || t.targetCurrency === currencyCode))
      .sort((a, b) => a.timestamp - b.timestamp);

    const lines = currentTrans.map(t => {
      let debit = 0; let credit = 0;
      if (t.type === TransactionType.BOARD && t.currency === currencyCode) debit = t.amount;
      else if (t.type === TransactionType.RESID && t.currency === currencyCode) credit = t.amount;
      else if (t.type === TransactionType.EXCHANGE) {
        if (t.currency === currencyCode) debit = t.amount;
        if (t.targetCurrency === currencyCode) credit = (t.convertedAmount || 0);
      }
      runningBalance = runningBalance + debit - credit;
      return { timestamp: t.timestamp, description: t.description, debit, credit, balance: runningBalance };
    });

    return { openingBalance, lines, finalCalculated: runningBalance };
  }, [redistributeData, transactions, customers]);

  return (
    <div className="space-y-6 text-right font-['Vazirmatn'] pb-20 fade-entry">
      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
           <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-900/10"><CalendarRange size={24} /></div>
           <div className="text-right">
              <h3 className="text-2xl font-black text-slate-900">قید و بازتوزیع بیلانس دوره‌ای</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Settlement Audit & Final Lock</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input type="text" placeholder="جستجوی مشتری..." className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold outline-none focus:bg-white transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            {['weekly', 'monthly', 'quarterly'].map((type) => (
              <button key={type} onClick={() => setPeriodType(type as PeriodType)} className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${periodType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
                {type === 'weekly' ? 'هفته‌وار' : type === 'monthly' ? 'ماه‌وار' : 'ربع‌وار'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b">
              <tr className="text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="p-6 font-black text-right border-l">مشخصات مشتری</th>
                {SUPPORTED_CURRENCIES.map(curr => <th key={curr.code} className="p-6 text-center font-black border-l">{curr.label} (دوره)</th>)}
                <th className="p-6 text-left font-black">عملیات قید بیلانس</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {periodicData.map(c => (
                <tr key={c.id} className={`group hover:bg-slate-50/50 transition-all ${c.isLocked ? 'bg-emerald-50/20' : ''}`}>
                  <td className="p-6 border-l border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${c.isLocked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {c.isLocked ? <CheckCircle2 size={18} /> : c.name.charAt(0)}
                      </div>
                      <div className="text-right">
                         <p className="font-black text-slate-900 text-sm">{c.name}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">ID: {c.code}</p>
                      </div>
                    </div>
                  </td>
                  {SUPPORTED_CURRENCIES.map(curr => {
                    const stats = c.stats[curr.code];
                    return (
                      <td key={curr.code} className="p-6 border-l border-slate-50">
                         <div className="flex flex-col items-center gap-1">
                            <div className="flex flex-col items-center text-[10px]">
                               <span className="text-emerald-600 font-bold">رسید: {stats.received.toLocaleString()}</span>
                               <span className="text-rose-600 font-bold">برد: {stats.paid.toLocaleString()}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-100 w-full text-center">
                               <p className={`font-black tabular-nums ${stats.movement > 0 ? 'text-emerald-700' : stats.movement < 0 ? 'text-rose-700' : 'text-slate-300'}`}>
                                  {stats.movement !== 0 ? (stats.movement > 0 ? '+' : '') + stats.movement.toLocaleString() : '---'}
                               </p>
                               <button 
                                 onClick={() => setRedistributeData({ customerId: c.id, customerName: c.name, currencyCode: curr.code, ...getPeriodRange(periodType) })}
                                 className="text-[8px] font-black text-blue-500 hover:underline mt-1 flex items-center gap-1 mx-auto"
                               >
                                 <RotateCcw size={10} /> بازتوزیع
                               </button>
                            </div>
                         </div>
                      </td>
                    );
                  })}
                  <td className="p-6 text-left">
                     <div className="flex flex-col items-end gap-3">
                        {c.isLocked ? (
                          <div className="flex flex-col items-end gap-1">
                             <div className="flex items-center gap-2 text-white bg-emerald-600 border border-emerald-700 px-4 py-3 rounded-2xl shadow-lg animate-in zoom-in duration-300">
                                <ShieldCheck size={16} />
                                <span className="text-[10px] font-black">بیلانس قید شد ({new Date(c.lastLockedTimestamp!).toLocaleDateString('fa-IR')})</span>
                             </div>
                             <button onClick={() => handleUnlock(c.id)} className="text-[10px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 px-2 py-1">
                                <Unlock size={12} /> باز کردن قید
                             </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleFinalLock(c.id)}
                            className="px-5 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-rose-700 shadow-lg flex items-center gap-2"
                          >
                             <Lock size={14} /> قید بیلانس این دوره
                          </button>
                        )}
                        <div className="text-right mt-1 border-t border-slate-100 pt-2 w-full">
                           {SUPPORTED_CURRENCIES.map(curr => {
                              const bal = c.stats[curr.code].totalBalance;
                              if (bal === 0) return null;
                              return (
                                <p key={curr.code} className={`text-[10px] font-black tabular-nums ${bal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                   {Math.abs(bal).toLocaleString()} <span className="opacity-40">{curr.code}</span>
                                </p>
                              );
                           })}
                        </div>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {redistributeData && auditResult && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border-4 border-white animate-in zoom-in duration-200">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg"><RotateCcw size={24} /></div>
                   <div className="text-right">
                      <h3 className="text-xl font-black text-slate-900">بازتوزیع خط‌به‌خط بیلانس ({redistributeData.currencyCode})</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Customer: {redistributeData.customerName}</p>
                   </div>
                </div>
                <button onClick={() => setRedistributeData(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24} /></button>
             </div>

             <div className="p-6 bg-amber-50 border-b border-amber-100 flex items-center gap-4">
                <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                <p className="text-[11px] font-black text-amber-950 leading-relaxed text-right">
                   گزارش بازمحاسبه نمایشی جهت قناعت مشتری. تمامی معاملات بازه انتخابی مجدداً از نقطه مانده قبل محاسبه شده‌اند.
                </p>
             </div>

             <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <table className="w-full text-right border-collapse text-xs">
                   <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black border-b border-slate-100">
                         <th className="py-5 px-6">تاریخ و زمان</th>
                         <th className="py-5 px-4">شرح معامله</th>
                         <th className="py-5 px-4 text-center">دریافت</th>
                         <th className="py-5 px-4 text-center">پرداخت</th>
                         <th className="py-5 px-8 text-left">مانده لحظه‌ای</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      <tr className="bg-blue-50/40">
                         <td className="p-6 font-black text-blue-800 italic" colSpan={2}>مانده منتقل شده از قبل (Opening Balance)</td>
                         <td colSpan={2}></td>
                         <td className="p-6 text-left font-black tabular-nums">
                            {Math.abs(auditResult.openingBalance).toLocaleString()} 
                            <span className="text-[9px] mr-2 opacity-40">{auditResult.openingBalance > 0 ? 'بدهکار' : 'بستانکار'}</span>
                         </td>
                      </tr>
                      {auditResult.lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-all">
                           <td className="p-5 text-slate-400 font-bold tabular-nums">
                              {new Date(line.timestamp).toLocaleString('fa-IR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                           </td>
                           <td className="p-5 text-slate-700 font-black italic">{line.description || 'ثبت در سیستم'}</td>
                           <td className="p-5 text-center font-black text-emerald-600">{line.credit !== 0 ? line.credit.toLocaleString() : '---'}</td>
                           <td className="p-5 text-center font-black text-rose-600">{line.debit !== 0 ? line.debit.toLocaleString() : '---'}</td>
                           <td className="p-5 text-left font-black tabular-nums bg-slate-50/50">
                              {Math.abs(line.balance).toLocaleString()}
                              <span className="text-[9px] mr-2 opacity-40">{line.balance > 0 ? 'بدهکار' : 'بستانکار'}</span>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             <div className="p-8 bg-slate-900 text-white flex justify-between items-center border-t-8 border-blue-600">
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">نتیجه نهایی بازمحاسبه:</p>
                   <h4 className="text-4xl font-black tabular-nums text-blue-400">
                      {Math.abs(auditResult.finalCalculated).toLocaleString()}
                      <span className="text-sm font-bold opacity-40 mr-3 uppercase">{redistributeData.currencyCode}</span>
                   </h4>
                </div>
                <div className="flex gap-4">
                   <button onClick={() => window.print()} className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-black text-sm flex items-center gap-3"><Printer size={20} /> چاپ گزارش</button>
                   <button onClick={() => setRedistributeData(null)} className="px-8 py-4 bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-xl font-black text-sm hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2"><LogOut size={20} /> خروج</button>
                   <button onClick={() => setRedistributeData(null)} className="px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-sm shadow-2xl">تائید و بستن</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeriodicBalances;